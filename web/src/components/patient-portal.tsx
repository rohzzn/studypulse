import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import {
  Button,
  Card,
  EmptyState,
  Input,
  Pill,
  TextArea,
} from './ui';
import { useElevenLabsVoiceInput } from '../hooks/use-elevenlabs-voice-input';
import { matchStudiesWithGemini } from '../lib/gemini-study-matcher';
import {
  type ActionResult,
  defaultApplicationDraft,
  type ApplicationDraft,
  type PatientApplication,
  type Profile,
  type ScreeningRequest,
  type StudyMatchResult,
  type StudyProgram,
} from '../lib/types';

type PatientPortalProps = {
  applications: PatientApplication[];
  busy: boolean;
  onRespond: (
    requestId: string,
    response: string
  ) => Promise<void>;
  onSubmitApplication: (
    studyId: string,
    draft: ApplicationDraft
  ) => Promise<ActionResult>;
  profile: Profile;
  requests: ScreeningRequest[];
  studies: StudyProgram[];
};

type PatientTab =
  | 'studies'
  | 'applications'
  | 'requests'
  | 'profile';

type StudyView =
  | 'list'
  | 'detail'
  | 'apply'
  | 'submitted';

export function PatientPortal({
  applications,
  busy,
  onRespond,
  onSubmitApplication,
  profile,
  requests,
  studies,
}: PatientPortalProps) {
  const [tab, setTab] = useState<PatientTab>('studies');
  const [studyView, setStudyView] =
    useState<StudyView>('list');
  const [selectedStudyId, setSelectedStudyId] =
    useState<string | null>(studies[0]?.id ?? null);
  const [selectedApplicationId, setSelectedApplicationId] =
    useState<string | null>(applications[0]?.id ?? null);
  const [submittedStudyId, setSubmittedStudyId] =
    useState<string | null>(null);
  const [applicationFeedback, setApplicationFeedback] =
    useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ApplicationDraft>({
    ...defaultApplicationDraft,
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    city: profile.city,
    state: profile.state,
  });
  const [requestResponses, setRequestResponses] = useState<
    Record<string, string>
  >({});
  const [studyMatchQuery, setStudyMatchQuery] = useState('');
  const [studyMatches, setStudyMatches] = useState<
    StudyMatchResult[]
  >([]);
  const [studyMatchSource, setStudyMatchSource] = useState<
    'gemini' | 'local' | null
  >(null);
  const [matchingStudies, setMatchingStudies] = useState(false);
  const studyVoiceInput = useElevenLabsVoiceInput();

  useEffect(() => {
    if (!selectedStudyId && studies[0]) {
      setSelectedStudyId(studies[0].id);
    }
  }, [selectedStudyId, studies]);

  useEffect(() => {
    if (!selectedApplicationId && applications[0]) {
      setSelectedApplicationId(applications[0].id);
    }
  }, [applications, selectedApplicationId]);

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      city: current.city || profile.city,
      state: current.state || profile.state,
    }));
  }, [profile]);

  const selectedStudy =
    studies.find((study) => study.id === selectedStudyId) ??
    null;

  const selectedApplication =
    applications.find(
      (application) =>
        application.id === selectedApplicationId
    ) ?? null;

  const selectedApplicationRequests = selectedApplication
    ? requests.filter(
        (request) =>
          request.applicationId === selectedApplication.id
      )
    : [];

  const openStudies = useMemo(
    () =>
      studies.filter(
        (study) => study.recruitStatus === 'open'
      ),
    [studies]
  );

  const studyMatchMap = useMemo(
    () =>
      new Map(
        studyMatches.map((match) => [match.studyId, match] as const)
      ),
    [studyMatches]
  );

  const visibleStudies = useMemo(() => {
    if (studyMatches.length === 0) {
      return openStudies;
    }

    const allowedStudyIds = new Set(
      studyMatches
        .filter((match) => match.status !== 'not_a_fit')
        .map((match) => match.studyId)
    );

    return openStudies
      .filter((study) => allowedStudyIds.has(study.id))
      .sort(
        (left, right) =>
          (studyMatchMap.get(right.id)?.score ?? 0) -
          (studyMatchMap.get(left.id)?.score ?? 0)
      );
  }, [openStudies, studyMatchMap, studyMatches]);

  const selectedStudyMatch = selectedStudy
    ? studyMatchMap.get(selectedStudy.id) ?? null
    : null;

  useEffect(() => {
    if (
      visibleStudies.length > 0 &&
      !visibleStudies.some(
        (study) => study.id === selectedStudyId
      )
    ) {
      setSelectedStudyId(visibleStudies[0]?.id ?? null);
    }
  }, [selectedStudyId, visibleStudies]);

  useEffect(() => {
    if (!submittedStudyId || applications.length === 0) {
      return;
    }

    const latestForStudy = applications.find(
      (application) => application.studyId === submittedStudyId
    );

    if (latestForStudy) {
      setSelectedApplicationId(latestForStudy.id);
    }
  }, [applications, submittedStudyId]);

  function buildInitialDraft() {
    return {
      ...defaultApplicationDraft,
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      city: profile.city,
      state: profile.state,
    };
  }

  function startApplication(studyId: string) {
    setSelectedStudyId(studyId);
    setDraft(buildInitialDraft());
    setStep(0);
    setStudyView('apply');
    setSubmittedStudyId(null);
    setApplicationFeedback(null);
  }

  async function handleSubmit() {
    if (!selectedStudyId) {
      return;
    }

    setApplicationFeedback(null);
    const result = await onSubmitApplication(
      selectedStudyId,
      draft
    );

    if (!result.ok) {
      setApplicationFeedback(result.message);
      return;
    }

    setDraft(buildInitialDraft());
    setStep(0);
    setSubmittedStudyId(selectedStudyId);
    setStudyView('submitted');
    setTab('studies');
  }

  async function handleStudyMatch() {
    if (!studyMatchQuery.trim()) {
      setStudyMatches([]);
      setStudyMatchSource(null);
      return;
    }

    setMatchingStudies(true);

    try {
      const result = await matchStudiesWithGemini({
        patientQuery: studyMatchQuery,
        profile,
        studies: openStudies,
      });

      setStudyMatches(result.matches);
      setStudyMatchSource(result.source);

      const firstLikelyStudy = result.matches.find(
        (match) => match.status !== 'not_a_fit'
      );

      if (firstLikelyStudy) {
        setSelectedStudyId(firstLikelyStudy.studyId);
      }
    } finally {
      setMatchingStudies(false);
    }
  }

  function clearStudyMatch() {
    setStudyMatchQuery('');
    setStudyMatches([]);
    setStudyMatchSource(null);
    studyVoiceInput.clearError();
  }

  async function handleStudyVoiceInput() {
    if (studyVoiceInput.busy) {
      return;
    }

    if (studyVoiceInput.isRecording) {
      const result = await studyVoiceInput.stopRecording();

      if (result.ok) {
        setStudyMatchQuery((current) =>
          mergeVoiceTranscript(current, result.transcript)
        );
      }

      return;
    }

    await studyVoiceInput.startRecording();
  }

  const screen = useMemo(() => {
    if (tab === 'applications') {
      return (
        <ApplicationsPanel
          applications={applications}
          selectedApplication={selectedApplication}
          requests={selectedApplicationRequests}
          studies={studies}
          onOpen={(applicationId) =>
            setSelectedApplicationId(applicationId)
          }
          onOpenRequests={() => setTab('requests')}
        />
      );
    }

    if (tab === 'requests') {
      return (
        <RequestsPanel
          applications={applications}
          busy={busy}
          onOpenApplication={(applicationId) => {
            setSelectedApplicationId(applicationId);
            setTab('applications');
          }}
          onRespond={onRespond}
          requestResponses={requestResponses}
          requests={requests}
          setRequestResponses={setRequestResponses}
          studies={studies}
        />
      );
    }

    if (tab === 'profile') {
      return (
        <ProfilePanel
          applicationCount={applications.length}
          profile={profile}
          requestCount={requests.filter(
            (request) => request.status === 'open'
          ).length}
        />
      );
    }

    return (
      <StudiesPanel
        busy={busy}
        draft={draft}
        matchingStudies={matchingStudies}
        matchQuery={studyMatchQuery}
        matchSource={studyMatchSource}
        onChangeMatchQuery={setStudyMatchQuery}
        onClearMatch={clearStudyMatch}
        onToggleVoiceInput={async () => {
          await handleStudyVoiceInput();
        }}
        onApply={startApplication}
        onBackToList={() => {
          setStudyView('list');
          setSubmittedStudyId(null);
          setApplicationFeedback(null);
        }}
        onOpenApplications={() => setTab('applications')}
        onChangeDraft={(nextDraft) => {
          setDraft(nextDraft);
          if (applicationFeedback) {
            setApplicationFeedback(null);
          }
        }}
        onOpenStudy={(studyId) => {
          setSelectedStudyId(studyId);
          setStudyView('detail');
          setSubmittedStudyId(null);
        }}
        onRunMatch={handleStudyMatch}
        onSelectStep={setStep}
        onSubmit={handleSubmit}
        selectedStudyMatch={selectedStudyMatch}
        selectedStudy={selectedStudy}
        step={step}
        studies={visibleStudies}
        studyMatches={studyMatchMap}
        studyView={studyView}
        submitFeedback={applicationFeedback}
        voiceBusy={studyVoiceInput.busy}
        voiceError={studyVoiceInput.error}
        voiceRecording={studyVoiceInput.isRecording}
        voiceStatus={studyVoiceInput.statusText}
      />
    );
  }, [
    applications,
    busy,
    draft,
    matchingStudies,
    onRespond,
    profile,
    requestResponses,
    requests,
    selectedApplication,
    selectedApplicationRequests,
    selectedStudy,
    selectedStudyMatch,
    step,
    applicationFeedback,
    studyMatchMap,
    studyMatchQuery,
    studyMatchSource,
    studyVoiceInput.busy,
    studyVoiceInput.error,
    studyVoiceInput.isRecording,
    studyVoiceInput.statusText,
    visibleStudies,
    studyView,
    tab,
  ]);

  return (
    <div className="portal-stack">
      <section className="portal-hero">
        <div>
          <p className="eyebrow">Patient portal</p>
          <h1>{profile.fullName || 'Patient'}</h1>
          <p>Browse studies, apply, and respond to clinic updates.</p>
        </div>
        <div className="hero-metrics">
          <Card>
            <span className="metric-label">Open studies</span>
            <strong>{studies.filter((study) => study.recruitStatus === 'open').length}</strong>
          </Card>
          <Card>
            <span className="metric-label">Applications</span>
            <strong>{applications.length}</strong>
          </Card>
          <Card>
            <span className="metric-label">Open requests</span>
            <strong>
              {requests.filter((request) => request.status === 'open').length}
            </strong>
          </Card>
        </div>
      </section>

      <div className="tab-row">
        <Pill active={tab === 'studies'} onClick={() => setTab('studies')}>
          Studies
        </Pill>
        <Pill
          active={tab === 'applications'}
          onClick={() => setTab('applications')}
        >
          My applications
        </Pill>
        <Pill active={tab === 'requests'} onClick={() => setTab('requests')}>
          Requests
        </Pill>
        <Pill active={tab === 'profile'} onClick={() => setTab('profile')}>
          Profile
        </Pill>
      </div>

      {screen}
    </div>
  );
}

function StudiesPanel({
  busy,
  draft,
  matchingStudies,
  matchQuery,
  matchSource,
  onChangeMatchQuery,
  onClearMatch,
  onToggleVoiceInput,
  onApply,
  onBackToList,
  onOpenApplications,
  onChangeDraft,
  onOpenStudy,
  onRunMatch,
  onSelectStep,
  onSubmit,
  selectedStudyMatch,
  selectedStudy,
  step,
  studies,
  studyMatches,
  studyView,
  submitFeedback,
  voiceBusy,
  voiceError,
  voiceRecording,
  voiceStatus,
}: {
  busy: boolean;
  draft: ApplicationDraft;
  matchingStudies: boolean;
  matchQuery: string;
  matchSource: 'gemini' | 'local' | null;
  onChangeMatchQuery: (value: string) => void;
  onClearMatch: () => void;
  onToggleVoiceInput: () => Promise<void>;
  onApply: (studyId: string) => void;
  onBackToList: () => void;
  onOpenApplications: () => void;
  onChangeDraft: (draft: ApplicationDraft) => void;
  onOpenStudy: (studyId: string) => void;
  onRunMatch: () => Promise<void>;
  onSelectStep: (step: number) => void;
  onSubmit: () => Promise<void>;
  selectedStudyMatch: StudyMatchResult | null;
  selectedStudy: StudyProgram | null;
  step: number;
  studies: StudyProgram[];
  studyMatches: Map<string, StudyMatchResult>;
  studyView: StudyView;
  submitFeedback: string | null;
  voiceBusy: boolean;
  voiceError: string | null;
  voiceRecording: boolean;
  voiceStatus: string | null;
}) {
  const steps = ['Basic', 'Health', 'Availability'];

  return (
    <div className="layout-grid">
      <div className="stack">
        <Card className="detail-card">
          <p className="eyebrow">Gemini study matcher</p>
          <h2>Find the best-fit trials</h2>
          <p>
            Describe your age, location, condition, medications,
            and visit preferences in plain English.
          </p>
          <TextArea
            label="What should StudyPulse look for?"
            placeholder="I am 42 in Ohio with migraines, on a beta blocker, and I need remote follow-ups."
            rows={5}
            value={matchQuery}
            onChange={onChangeMatchQuery}
          />
          <div className="button-row">
            <Button
              disabled={matchingStudies || voiceBusy}
              variant="secondary"
              onClick={() => void onToggleVoiceInput()}
            >
              {voiceBusy
                ? 'Transcribing...'
                : voiceRecording
                  ? 'Stop recording'
                  : 'Use mic'}
            </Button>
            <Button
              disabled={matchingStudies}
              onClick={() => void onRunMatch()}
            >
              {matchingStudies
                ? 'Matching...'
                : 'Find matching studies'}
            </Button>
            {matchQuery ? (
              <Button variant="secondary" onClick={onClearMatch}>
                Clear matcher
              </Button>
            ) : null}
          </div>
          {voiceStatus ? (
            <p className="muted">{voiceStatus}</p>
          ) : null}
          {voiceError ? <p className="muted">{voiceError}</p> : null}
          {matchSource ? (
            <p className="muted">
              Showing ranked matches from{' '}
              {matchSource === 'gemini'
                ? 'Gemini'
                : 'the local fallback'}.
            </p>
          ) : null}
        </Card>

        {studies.length === 0 ? (
          <EmptyState
            title="No likely matches"
            body="Try broadening the request or removing one of the restrictions."
          />
        ) : null}

        {studies
          .map((study) => (
            <Card key={study.id}>
              <div className="card-topline">
                <div>
                  <p className="eyebrow">{study.condition}</p>
                  <h3>{study.title}</h3>
                </div>
                <Pill>
                  {studyMatches.has(study.id)
                    ? prettyMatchStatus(
                        studyMatches.get(study.id)?.status ??
                          'review_needed'
                      )
                    : study.locationType}
                </Pill>
              </div>
              <p>{study.shortDescription}</p>
              <p className="muted">{study.eligibilitySummary}</p>
              {studyMatches.get(study.id) ? (
                <>
                  <p>{studyMatches.get(study.id)?.reason}</p>
                  <p className="muted">
                    {studyMatches.get(study.id)?.caution}
                  </p>
                </>
              ) : null}
              <div className="button-row">
                <Button
                  variant="secondary"
                  onClick={() => onOpenStudy(study.id)}
                >
                  Details
                </Button>
                <Button
                  onClick={() => {
                    onApply(study.id);
                  }}
                >
                  Apply
                </Button>
              </div>
            </Card>
          ))}
      </div>

      <div className="stack">
        {selectedStudy ? (
          studyView === 'apply' ? null : (
            <Card className="detail-card">
              <p className="eyebrow">Study detail</p>
              <h2>{selectedStudy.title}</h2>
              <p>{selectedStudy.description}</p>
              {selectedStudyMatch ? (
                <div className="timeline">
                  <div className="timeline-item">
                    <span className="muted-label">Gemini fit</span>
                    <p>{prettyMatchStatus(selectedStudyMatch.status)}</p>
                  </div>
                  <div className="timeline-item">
                    <span className="muted-label">Reason</span>
                    <p>{selectedStudyMatch.reason}</p>
                  </div>
                  <div className="timeline-item">
                    <span className="muted-label">Caution</span>
                    <p>{selectedStudyMatch.caution}</p>
                  </div>
                </div>
              ) : null}
              <div className="info-grid">
                <div>
                  <span className="muted-label">Who it is for</span>
                  <p>{selectedStudy.eligibilitySummary}</p>
                </div>
                <div>
                  <span className="muted-label">Requirements</span>
                  <p>{selectedStudy.requirements}</p>
                </div>
                <div>
                  <span className="muted-label">Location</span>
                  <p>{selectedStudy.locationLabel}</p>
                </div>
                <div>
                  <span className="muted-label">Time commitment</span>
                  <p>{selectedStudy.timeCommitment}</p>
                </div>
              </div>
              <div className="button-row">
                <Button onClick={() => onApply(selectedStudy.id)}>
                  Apply now
                </Button>
              </div>
            </Card>
          )
        ) : (
          <EmptyState
            title="No study selected"
            body="Choose a study to review the details and start your application."
          />
        )}

        {studyView === 'apply' && selectedStudy ? (
          <Card className="detail-card">
            <div className="card-topline">
              <div>
                <p className="eyebrow">Application</p>
                <h2>Step {step + 1} of 3</h2>
              </div>
              <Pill>{steps[step]}</Pill>
            </div>

            <div className="tab-row">
              {steps.map((label, index) => (
                <Pill
                  key={label}
                  active={step === index}
                  onClick={() => onSelectStep(index)}
                >
                  {label}
                </Pill>
              ))}
            </div>

            {step === 0 ? (
              <div className="stack">
                <Input
                  label="Name"
                  placeholder="Jamie Brooks"
                  value={draft.fullName}
                  onChange={(value) =>
                    onChangeDraft({ ...draft, fullName: value })
                  }
                />
                <div className="two-col">
                  <Input
                    label="Age"
                    placeholder="25"
                    value={draft.age}
                    onChange={(value) =>
                      onChangeDraft({ ...draft, age: value })
                    }
                  />
                  <Input
                    label="Phone"
                    placeholder="(555) 555-5555"
                    value={draft.phone}
                    onChange={(value) =>
                      onChangeDraft({ ...draft, phone: value })
                    }
                  />
                </div>
                <div className="two-col">
                  <Input
                    label="City"
                    placeholder="Cincinnati"
                    value={draft.city}
                    onChange={(value) =>
                      onChangeDraft({ ...draft, city: value })
                    }
                  />
                  <Input
                    label="State"
                    placeholder="OH"
                    value={draft.state}
                    onChange={(value) =>
                      onChangeDraft({ ...draft, state: value })
                    }
                  />
                </div>
                <Input
                  label="Email"
                  placeholder="you@example.com"
                  type="email"
                  value={draft.email}
                  onChange={(value) =>
                    onChangeDraft({ ...draft, email: value })
                  }
                />
              </div>
            ) : null}

            {step === 1 ? (
              <div className="stack">
                <TextArea
                  label="Condition"
                  placeholder="Describe your condition or symptoms."
                  value={draft.condition}
                  onChange={(value) =>
                    onChangeDraft({ ...draft, condition: value })
                  }
                />
                <TextArea
                  label="Current medications"
                  placeholder="List medications or write none."
                  value={draft.currentMedications}
                  onChange={(value) =>
                    onChangeDraft({
                      ...draft,
                      currentMedications: value,
                    })
                  }
                />
              </div>
            ) : null}

            {step === 2 ? (
              <div className="stack">
                <TextArea
                  label="Availability"
                  placeholder="When can you do calls, visits, or remote follow-ups?"
                  value={draft.availability}
                  onChange={(value) =>
                    onChangeDraft({
                      ...draft,
                      availability: value,
                    })
                  }
                />
                <TextArea
                  label="Why do you want to join?"
                  placeholder="Short note about why this study is a fit."
                  value={draft.motivation}
                  onChange={(value) =>
                    onChangeDraft({ ...draft, motivation: value })
                  }
                />
              </div>
            ) : null}

            {submitFeedback ? (
              <p className="muted">{submitFeedback}</p>
            ) : null}

            <div className="button-row">
              {step > 0 ? (
                <Button
                  variant="secondary"
                  onClick={() => onSelectStep(step - 1)}
                >
                  Back
                </Button>
              ) : (
                <Button variant="secondary" onClick={onBackToList}>
                  Cancel
                </Button>
              )}
              {step < 2 ? (
                <Button onClick={() => onSelectStep(step + 1)}>
                  Next
                </Button>
              ) : (
                <Button disabled={busy} onClick={() => void onSubmit()}>
                  {busy ? 'Submitting...' : 'Submit application'}
                </Button>
              )}
            </div>
          </Card>
        ) : null}

        {studyView === 'submitted' ? (
          <Card className="detail-card">
            <p className="eyebrow">Submitted</p>
            <h2>Your application is in.</h2>
            <p>
              The clinic can now review your answers, ask for more
              information, or schedule a screening call.
            </p>
            <div className="button-row">
              <Button onClick={onBackToList}>Back to studies</Button>
              <Button
                variant="secondary"
                onClick={onOpenApplications}
              >
                Open applications
              </Button>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function ApplicationsPanel({
  applications,
  onOpen,
  onOpenRequests,
  requests,
  selectedApplication,
  studies,
}: {
  applications: PatientApplication[];
  onOpen: (applicationId: string) => void;
  onOpenRequests: () => void;
  requests: ScreeningRequest[];
  selectedApplication: PatientApplication | null;
  studies: StudyProgram[];
}) {
  return (
    <div className="layout-grid">
      <div className="stack">
        {applications.length === 0 ? (
          <EmptyState
            title="No applications yet"
            body="Apply to a study and your status will appear here."
          />
        ) : null}

        {applications.map((application) => {
          const study = studies.find(
            (item) => item.id === application.studyId
          );

          return (
            <Card key={application.id}>
              <div className="card-topline">
                <div>
                  <p className="eyebrow">
                    Applied {formatDate(application.createdAt)}
                  </p>
                  <h3>{study?.title ?? 'Study'}</h3>
                </div>
                <Pill>{prettyStatus(application.status)}</Pill>
              </div>
              <p>{application.condition}</p>
              <Button
                variant="secondary"
                onClick={() => onOpen(application.id)}
              >
                View status
              </Button>
            </Card>
          );
        })}
      </div>

      <div className="stack">
        {selectedApplication ? (
          <Card className="detail-card">
            <p className="eyebrow">Application status</p>
            <h2>{prettyStatus(selectedApplication.status)}</h2>
            <div className="timeline">
              <div className="timeline-item">
                <span className="muted-label">Study</span>
                <p>
                  {
                    studies.find(
                      (study) =>
                        study.id === selectedApplication.studyId
                    )?.title
                  }
                </p>
              </div>
              <div className="timeline-item">
                <span className="muted-label">Condition</span>
                <p>{selectedApplication.condition}</p>
              </div>
              <div className="timeline-item">
                <span className="muted-label">Availability</span>
                <p>{selectedApplication.availability}</p>
              </div>
              <div className="timeline-item">
                <span className="muted-label">Clinic notes</span>
                <p>
                  {selectedApplication.clinicianNotes ||
                    'No coordinator notes yet.'}
                </p>
              </div>
              {selectedApplication.scheduledCallAt ? (
                <div className="timeline-item">
                  <span className="muted-label">Call scheduled</span>
                  <p>{selectedApplication.scheduledCallAt}</p>
                </div>
              ) : null}
            </div>

            {requests.length > 0 ? (
              <Button onClick={onOpenRequests}>Open requests</Button>
            ) : null}
          </Card>
        ) : (
          <EmptyState
            title="Choose an application"
            body="Select an application on the left to review your current status."
          />
        )}
      </div>
    </div>
  );
}

function RequestsPanel({
  applications,
  busy,
  onOpenApplication,
  onRespond,
  requestResponses,
  requests,
  setRequestResponses,
  studies,
}: {
  applications: PatientApplication[];
  busy: boolean;
  onOpenApplication: (applicationId: string) => void;
  onRespond: (
    requestId: string,
    response: string
  ) => Promise<void>;
  requestResponses: Record<string, string>;
  requests: ScreeningRequest[];
  setRequestResponses: Dispatch<
    SetStateAction<Record<string, string>>
  >;
  studies: StudyProgram[];
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        title="No requests right now"
        body="If the clinic needs anything else from you, it will show up here."
      />
    );
  }

  return (
    <div className="stack">
      {requests.map((request) => {
        const application = applications.find(
          (item) => item.id === request.applicationId
        );
        const study = studies.find(
          (item) => item.id === application?.studyId
        );

        return (
          <Card key={request.id}>
            <div className="card-topline">
              <div>
                <p className="eyebrow">{study?.title ?? 'Study'}</p>
                <h3>{request.title}</h3>
              </div>
              <Pill>{request.status === 'open' ? 'Open' : 'Responded'}</Pill>
            </div>
            <p>{request.body}</p>
            <p className="muted">{request.dueLabel}</p>
            {request.status === 'responded' ? (
              <Card className="subtle-card">
                <span className="muted-label">Your response</span>
                <p>{request.patientResponse}</p>
              </Card>
            ) : (
              <TextArea
                label="Response"
                placeholder="Type your response"
                value={requestResponses[request.id] ?? ''}
                onChange={(value) =>
                  setRequestResponses((current) => ({
                    ...current,
                    [request.id]: value,
                  }))
                }
              />
            )}
            <div className="button-row">
              {request.status === 'open' ? (
                <Button
                  disabled={busy}
                  onClick={() =>
                    void onRespond(
                      request.id,
                      requestResponses[request.id] ?? ''
                    )
                  }
                >
                  {busy ? 'Sending...' : 'Send response'}
                </Button>
              ) : null}
              <Button
                variant="secondary"
                onClick={() =>
                  onOpenApplication(request.applicationId)
                }
              >
                Open application
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function ProfilePanel({
  applicationCount,
  profile,
  requestCount,
}: {
  applicationCount: number;
  profile: Profile;
  requestCount: number;
}) {
  return (
    <div className="layout-grid">
      <Card className="detail-card">
        <p className="eyebrow">Account</p>
        <h2>{profile.fullName || 'Patient account'}</h2>
        <div className="info-grid">
          <div>
            <span className="muted-label">Email</span>
            <p>{profile.email}</p>
          </div>
          <div>
            <span className="muted-label">Phone</span>
            <p>{profile.phone || 'Not provided'}</p>
          </div>
          <div>
            <span className="muted-label">Location</span>
            <p>
              {[profile.city, profile.state]
                .filter(Boolean)
                .join(', ') || 'Not provided'}
            </p>
          </div>
          <div>
            <span className="muted-label">Role</span>
            <p>Patient</p>
          </div>
        </div>
      </Card>

      <div className="stack">
        <Card>
          <span className="metric-label">Applications</span>
          <strong>{applicationCount}</strong>
        </Card>
        <Card>
          <span className="metric-label">Open requests</span>
          <strong>{requestCount}</strong>
        </Card>
      </div>
    </div>
  );
}

function prettyStatus(status: PatientApplication['status']) {
  switch (status) {
    case 'under_review':
      return 'Under review';
    case 'info_requested':
      return 'Needs more info';
    case 'not_eligible':
      return 'Not eligible';
    case 'scheduled_call':
      return 'Call scheduled';
    case 'eligible':
      return 'Eligible';
    case 'submitted':
    default:
      return 'Submitted';
  }
}

function prettyMatchStatus(status: StudyMatchResult['status']) {
  switch (status) {
    case 'likely_fit':
      return 'Likely fit';
    case 'possible_fit':
      return 'Possible fit';
    case 'review_needed':
      return 'Review needed';
    case 'not_a_fit':
    default:
      return 'Not a fit';
  }
}

function mergeVoiceTranscript(
  currentValue: string,
  transcript: string
) {
  const trimmedCurrent = currentValue.trim();
  const trimmedTranscript = transcript.trim();

  if (!trimmedCurrent) {
    return trimmedTranscript;
  }

  if (!trimmedTranscript) {
    return trimmedCurrent;
  }

  return `${trimmedCurrent} ${trimmedTranscript}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}
