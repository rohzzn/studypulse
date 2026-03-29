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
import {
  defaultApplicationDraft,
  type ApplicationDraft,
  type PatientApplication,
  type Profile,
  type ScreeningRequest,
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
  ) => Promise<void>;
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

  async function handleSubmit() {
    if (!selectedStudyId) {
      return;
    }

    await onSubmitApplication(selectedStudyId, draft);
    setDraft({
      ...defaultApplicationDraft,
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      city: profile.city,
      state: profile.state,
    });
    setStep(0);
    setStudyView('submitted');
    setTab('studies');
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
        onApply={() => setStudyView('apply')}
        onBackToList={() => setStudyView('list')}
        onChangeDraft={setDraft}
        onOpenStudy={(studyId) => {
          setSelectedStudyId(studyId);
          setStudyView('detail');
        }}
        onSelectStep={setStep}
        onSubmit={handleSubmit}
        selectedStudy={selectedStudy}
        step={step}
        studies={studies}
        studyView={studyView}
      />
    );
  }, [
    applications,
    busy,
    draft,
    onRespond,
    profile,
    requestResponses,
    requests,
    selectedApplication,
    selectedApplicationRequests,
    selectedStudy,
    step,
    studies,
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
  onApply,
  onBackToList,
  onChangeDraft,
  onOpenStudy,
  onSelectStep,
  onSubmit,
  selectedStudy,
  step,
  studies,
  studyView,
}: {
  busy: boolean;
  draft: ApplicationDraft;
  onApply: () => void;
  onBackToList: () => void;
  onChangeDraft: (draft: ApplicationDraft) => void;
  onOpenStudy: (studyId: string) => void;
  onSelectStep: (step: number) => void;
  onSubmit: () => Promise<void>;
  selectedStudy: StudyProgram | null;
  step: number;
  studies: StudyProgram[];
  studyView: StudyView;
}) {
  const steps = ['Basic', 'Health', 'Availability'];

  return (
    <div className="layout-grid">
      <div className="stack">
        {studies
          .filter((study) => study.recruitStatus === 'open')
          .map((study) => (
            <Card key={study.id}>
              <div className="card-topline">
                <div>
                  <p className="eyebrow">{study.condition}</p>
                  <h3>{study.title}</h3>
                </div>
                <Pill>{study.locationType}</Pill>
              </div>
              <p>{study.shortDescription}</p>
              <p className="muted">{study.eligibilitySummary}</p>
              <div className="button-row">
                <Button
                  variant="secondary"
                  onClick={() => onOpenStudy(study.id)}
                >
                  Details
                </Button>
                <Button
                  onClick={() => {
                    onOpenStudy(study.id);
                    onApply();
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
          <Card className="detail-card">
            <p className="eyebrow">Study detail</p>
            <h2>{selectedStudy.title}</h2>
            <p>{selectedStudy.description}</p>
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
              {studyView !== 'apply' ? (
                <Button onClick={onApply}>Apply now</Button>
              ) : (
                <Button variant="secondary" onClick={onBackToList}>
                  Close form
                </Button>
              )}
            </div>
          </Card>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}
