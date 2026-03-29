import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AppCard,
  Badge,
  Field,
  MultiLineField,
  PillButton,
  PrimaryButton,
  SecondaryButton,
} from '../components/studyPulseUi';
import { defaultApplicationDraft } from '../data/studypulseMockData';
import { matchStudiesWithGemini } from '../lib/geminiStudyMatcher';
import { colors } from '../theme/tokens';
import type {
  ActionResult,
  PatientApplication,
  PatientApplicationDraft,
  ScreeningRequest,
  StudyMatchResult,
  StudyPulseProfile,
  StudyProgram,
} from '../types/studypulse';

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

type ApplicationView = 'list' | 'detail';

type PatientFlowScreenProps = {
  accountMode: 'auth' | 'demo';
  accountName?: string | null;
  accountProfile?: StudyPulseProfile | null;
  applications: PatientApplication[];
  onClearSession: () => void;
  onRespondToRequest: (
    requestId: string,
    response: string
  ) => Promise<ActionResult>;
  onRestoreByEmail: (email: string) => Promise<ActionResult>;
  onSubmitApplication: (
    draft: PatientApplicationDraft,
    studyId: string,
    existing?: PatientApplication
  ) => Promise<ActionResult>;
  patientEmail: string | null;
  requests: ScreeningRequest[];
  saving: boolean;
  studies: StudyProgram[];
};

export function PatientFlowScreen({
  accountMode,
  accountName,
  accountProfile,
  applications,
  onClearSession,
  onRespondToRequest,
  onRestoreByEmail,
  onSubmitApplication,
  patientEmail,
  requests,
  saving,
  studies,
}: PatientFlowScreenProps) {
  const [activeTab, setActiveTab] =
    useState<PatientTab>('studies');
  const [studyView, setStudyView] =
    useState<StudyView>('list');
  const [applicationView, setApplicationView] =
    useState<ApplicationView>('list');
  const [selectedStudyId, setSelectedStudyId] =
    useState<string | null>(studies[0]?.id ?? null);
  const [selectedApplicationId, setSelectedApplicationId] =
    useState<string | null>(applications[0]?.id ?? null);
  const [editingApplicationId, setEditingApplicationId] =
    useState<string | null>(null);
  const [submittedApplicationId, setSubmittedApplicationId] =
    useState<string | null>(null);
  const [applicationStep, setApplicationStep] =
    useState(0);
  const [restoreEmail, setRestoreEmail] = useState(
    patientEmail ?? ''
  );
  const [draft, setDraft] = useState<PatientApplicationDraft>(
    () => buildDefaultDraft(accountProfile, patientEmail)
  );
  const [studyMatchQuery, setStudyMatchQuery] = useState('');
  const [studyMatches, setStudyMatches] = useState<
    StudyMatchResult[]
  >([]);
  const [studyMatchSource, setStudyMatchSource] = useState<
    'gemini' | 'local' | null
  >(null);
  const [matchingStudies, setMatchingStudies] =
    useState(false);
  const [requestResponses, setRequestResponses] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    const firstStudy = studies[0];

    if (!selectedStudyId && firstStudy) {
      setSelectedStudyId(firstStudy.id);
    }
  }, [selectedStudyId, studies]);

  useEffect(() => {
    if (patientEmail) {
      setRestoreEmail(patientEmail);
    }
  }, [patientEmail]);

  useEffect(() => {
    const firstApplication = applications[0];

    if (!selectedApplicationId && firstApplication) {
      setSelectedApplicationId(firstApplication.id);
    }
  }, [applications, selectedApplicationId]);

  const selectedStudy =
    studies.find((study) => study.id === selectedStudyId) ??
    null;

  const selectedApplication =
    applications.find(
      (application) => application.id === selectedApplicationId
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

  const screenTitle = useMemo(() => {
    if (activeTab === 'applications') {
      return applicationView === 'detail'
        ? 'Application status'
        : 'My applications';
    }

    if (activeTab === 'requests') {
      return 'Requests';
    }

    if (activeTab === 'profile') {
      return 'Profile';
    }

    if (studyView === 'detail') {
      return 'Study detail';
    }

    if (studyView === 'apply') {
      return 'Apply';
    }

    if (studyView === 'submitted') {
      return 'Submitted';
    }

    return 'Studies';
  }, [activeTab, applicationView, studyView]);

  function startApply(
    studyId: string,
    existing?: PatientApplication
  ) {
    setSelectedStudyId(studyId);
    setEditingApplicationId(existing?.id ?? null);
    setApplicationStep(0);
    setStudyView('apply');
    setDraft(
      existing
        ? {
            fullName: existing.fullName,
            age: String(existing.age),
            city: existing.city,
            state: existing.state,
            phone: existing.phone,
            email: existing.email,
            condition: existing.condition,
            currentMedications: existing.currentMedications,
            availability: existing.availability,
            motivation: existing.motivation,
          }
        : buildDefaultDraft(accountProfile, patientEmail)
    );
  }

  async function handleSubmitApplication() {
    if (!selectedStudyId) {
      return;
    }

    const existing = applications.find(
      (application) => application.id === editingApplicationId
    );
    const result = await onSubmitApplication(
      draft,
      selectedStudyId,
      existing
    );

    if (!result.ok) {
      return;
    }

    if (editingApplicationId) {
      setSelectedApplicationId(editingApplicationId);
      setStudyView('list');
      setApplicationView('detail');
      setActiveTab('applications');
      setEditingApplicationId(null);
      setDraft(
        buildDefaultDraft(accountProfile, patientEmail)
      );
      return;
    }

    setSubmittedApplicationId(result.applicationId ?? null);
    setSelectedApplicationId(result.applicationId ?? null);
    setStudyView('submitted');
    setDraft(buildDefaultDraft(accountProfile, patientEmail));
  }

  async function handleRestore() {
    const result = await onRestoreByEmail(restoreEmail);

    if (result.ok) {
      setActiveTab('applications');
    }
  }

  async function handleRespond(requestId: string) {
    const response = requestResponses[requestId] ?? '';
    const result = await onRespondToRequest(requestId, response);

    if (result.ok) {
      setRequestResponses((current) => ({
        ...current,
        [requestId]: '',
      }));
    }
  }

  async function handleMatchStudies() {
    if (!studyMatchQuery.trim()) {
      setStudyMatches([]);
      setStudyMatchSource(null);
      return;
    }

    setMatchingStudies(true);

    try {
      const result = await matchStudiesWithGemini({
        patientQuery: studyMatchQuery,
        profile: accountProfile,
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

  function clearStudyMatches() {
    setStudyMatchQuery('');
    setStudyMatches([]);
    setStudyMatchSource(null);
  }

  const content = useMemo(() => {
    if (activeTab === 'studies') {
      if (studyView === 'detail' && selectedStudy) {
        return (
          <StudyDetailView
            match={selectedStudyMatch}
            study={selectedStudy}
            onApply={() => startApply(selectedStudy.id)}
            onBack={() => setStudyView('list')}
          />
        );
      }

      if (studyView === 'apply' && selectedStudy) {
        return (
          <ApplicationFormView
            draft={draft}
            onBack={() => {
              if (applicationStep > 0) {
                setApplicationStep((current) => current - 1);
                return;
              }

              setStudyView('detail');
              setEditingApplicationId(null);
            }}
            onChange={setDraft}
            onNext={() =>
              setApplicationStep((current) =>
                Math.min(2, current + 1)
              )
            }
            onSelectStep={setApplicationStep}
            onSubmit={handleSubmitApplication}
            saving={saving}
            step={applicationStep}
            study={selectedStudy}
          />
        );
      }

      if (studyView === 'submitted') {
        const submittedApplication = applications.find(
          (application) =>
            application.id === submittedApplicationId
        );

        return (
          <SubmittedView
            application={submittedApplication ?? null}
            study={
              studies.find(
                (study) =>
                  study.id === submittedApplication?.studyId
              ) ?? selectedStudy
            }
            onBackToStudies={() => {
              setStudyView('list');
              setSubmittedApplicationId(null);
            }}
            onViewApplications={() => {
              setStudyView('list');
              setSubmittedApplicationId(null);
              setActiveTab('applications');
            }}
          />
        );
      }

      return (
        <StudyListView
          matchingStudies={matchingStudies}
          matchSource={studyMatchSource}
          matchQuery={studyMatchQuery}
          onChangeMatchQuery={setStudyMatchQuery}
          onClearMatch={clearStudyMatches}
          onRunMatch={handleMatchStudies}
          studyMatches={studyMatchMap}
          studies={visibleStudies}
          onApply={(studyId) => startApply(studyId)}
          onOpenStudy={(studyId) => {
            setSelectedStudyId(studyId);
            setStudyView('detail');
          }}
        />
      );
    }

    if (activeTab === 'applications') {
      if (applicationView === 'detail' && selectedApplication) {
        return (
          <ApplicationDetailView
            application={selectedApplication}
            requests={selectedApplicationRequests}
            study={
              studies.find(
                (study) =>
                  study.id === selectedApplication.studyId
              ) ?? null
            }
            onBack={() => setApplicationView('list')}
            onEdit={() =>
              startApply(
                selectedApplication.studyId,
                selectedApplication
              )
            }
            onGoToRequests={() => setActiveTab('requests')}
          />
        );
      }

      return (
        <ApplicationListView
          accountMode={accountMode}
          applications={applications}
          studies={studies}
          onOpen={(applicationId) => {
            setSelectedApplicationId(applicationId);
            setApplicationView('detail');
          }}
          onRestore={handleRestore}
          patientEmail={patientEmail}
          restoreEmail={restoreEmail}
          setRestoreEmail={setRestoreEmail}
        />
      );
    }

    if (activeTab === 'requests') {
      return (
        <RequestsView
          applications={applications}
          onOpenApplication={(applicationId) => {
            setSelectedApplicationId(applicationId);
            setApplicationView('detail');
            setActiveTab('applications');
          }}
          onRespond={handleRespond}
          requestResponses={requestResponses}
          requests={requests}
          saving={saving}
          setRequestResponses={setRequestResponses}
          studies={studies}
        />
      );
    }

    return (
      <ProfileView
        accountMode={accountMode}
        accountName={accountName ?? null}
        onClearSession={onClearSession}
        onRestore={handleRestore}
        patientEmail={patientEmail}
        restoreEmail={restoreEmail}
        setRestoreEmail={setRestoreEmail}
      />
    );
  }, [
    activeTab,
    applicationStep,
    applicationView,
    accountMode,
    accountName,
    accountProfile,
    applications,
    draft,
    matchingStudies,
    onClearSession,
    patientEmail,
    requestResponses,
    requests,
    restoreEmail,
    saving,
    selectedApplication,
    selectedApplicationRequests,
    selectedStudy,
    selectedStudyMatch,
    studies,
    studyMatchMap,
    studyMatchQuery,
    studyMatchSource,
    visibleStudies,
    studyView,
    submittedApplicationId,
  ]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{screenTitle}</Text>
      </View>

      <View style={styles.tabBar}>
        <PillButton
          active={activeTab === 'studies'}
          label="Studies"
          onPress={() => {
            setActiveTab('studies');
            setStudyView('list');
          }}
        />
        <PillButton
          active={activeTab === 'applications'}
          label="My Applications"
          onPress={() => {
            setActiveTab('applications');
            setApplicationView('list');
          }}
        />
        <PillButton
          active={activeTab === 'requests'}
          label="Requests"
          onPress={() => setActiveTab('requests')}
        />
        <PillButton
          active={activeTab === 'profile'}
          label="Profile"
          onPress={() => setActiveTab('profile')}
        />
      </View>

      <View style={styles.content}>{content}</View>
    </View>
  );
}

function StudyListView({
  matchingStudies,
  matchQuery,
  matchSource,
  onChangeMatchQuery,
  onClearMatch,
  onRunMatch,
  studyMatches,
  studies,
  onApply,
  onOpenStudy,
}: {
  matchingStudies: boolean;
  matchQuery: string;
  matchSource: 'gemini' | 'local' | null;
  onChangeMatchQuery: (value: string) => void;
  onClearMatch: () => void;
  onRunMatch: () => void;
  studies: StudyProgram[];
  studyMatches: Map<string, StudyMatchResult>;
  onApply: (studyId: string) => void;
  onOpenStudy: (studyId: string) => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <AppCard style={styles.cardGap}>
        <Text style={styles.sectionTitle}>AI study matcher</Text>
        <Text style={styles.bodyText}>
          Describe your age, location, condition, medications,
          and visit preference in plain English.
        </Text>
        <MultiLineField
          label="What should StudyPulse look for?"
          placeholder="I am 42 in Ohio with migraines, on a beta blocker, and I need remote follow-ups."
          value={matchQuery}
          onChangeText={onChangeMatchQuery}
        />
        <PrimaryButton
          disabled={matchingStudies}
          label={
            matchingStudies ? 'Matching...' : 'Find matching studies'
          }
          onPress={() => {
            void onRunMatch();
          }}
        />
        {matchQuery ? (
          <SecondaryButton
            label="Clear matcher"
            onPress={onClearMatch}
          />
        ) : null}
        {matchSource ? (
          <Text style={styles.requirementText}>
            Showing ranked matches from{' '}
            {matchSource === 'gemini'
              ? 'Gemini'
              : 'local fallback'}.
          </Text>
        ) : null}
      </AppCard>

      {studies.length === 0 ? (
        <AppCard>
          <Text style={styles.bodyText}>
            {matchQuery
              ? 'No likely study matches were found. Try adding more detail or broadening your request.'
              : 'No open studies right now.'}
          </Text>
        </AppCard>
      ) : null}
      {studies.map((study) => {
        const match = studyMatches.get(study.id) ?? null;

        return (
          <AppCard key={study.id} style={styles.cardGap}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{study.title}</Text>
              <Badge
                label={
                  match
                    ? prettyMatchStatus(match.status)
                    : study.locationType
                }
                tone={
                  match
                    ? matchStatusTone(match.status)
                    : 'accent'
                }
              />
            </View>
            <Text style={styles.metaText}>{study.condition}</Text>
            <Text style={styles.bodyText}>
              {study.shortDescription}
            </Text>
            <Text style={styles.requirementText}>
              {study.eligibilitySummary}
            </Text>
            {match ? (
              <>
                <Text style={styles.bodyText}>{match.reason}</Text>
                <Text style={styles.requirementText}>
                  {match.caution}
                </Text>
              </>
            ) : null}
            <Text style={styles.metaText}>
              {study.locationLabel}
            </Text>
            <View style={styles.actionRow}>
              <PrimaryButton
                label="Apply"
                onPress={() => onApply(study.id)}
              />
              <SecondaryButton
                label="Details"
                onPress={() => onOpenStudy(study.id)}
              />
            </View>
          </AppCard>
        );
      })}
    </ScrollView>
  );
}

function StudyDetailView({
  match,
  study,
  onApply,
  onBack,
}: {
  match: StudyMatchResult | null;
  study: StudyProgram;
  onApply: () => void;
  onBack: () => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <AppCard style={styles.cardGap}>
        <Text style={styles.cardTitle}>{study.title}</Text>
        <Text style={styles.metaText}>{study.condition}</Text>
        <Text style={styles.bodyText}>{study.description}</Text>
        {match ? (
          <>
            <Badge
              label={prettyMatchStatus(match.status)}
              tone={matchStatusTone(match.status)}
            />
            <Text style={styles.bodyText}>{match.reason}</Text>
            <Text style={styles.requirementText}>
              {match.caution}
            </Text>
          </>
        ) : null}
      </AppCard>
      <AppCard style={styles.cardGap}>
        <Text style={styles.sectionTitle}>Who it is for</Text>
        <Text style={styles.bodyText}>
          {study.eligibilitySummary}
        </Text>
      </AppCard>
      <AppCard style={styles.cardGap}>
        <Text style={styles.sectionTitle}>Key requirements</Text>
        <Text style={styles.bodyText}>{study.requirements}</Text>
        <Text style={styles.metaText}>
          Age {study.ageMin}-{study.ageMax}
        </Text>
        <Text style={styles.metaText}>
          {study.locationLabel}
        </Text>
        <Text style={styles.metaText}>
          {study.timeCommitment}
        </Text>
      </AppCard>
      <View style={styles.actionRow}>
        <PrimaryButton label="Apply now" onPress={onApply} />
        <SecondaryButton label="Back" onPress={onBack} />
      </View>
    </ScrollView>
  );
}

function ApplicationFormView({
  draft,
  onBack,
  onChange,
  onNext,
  onSelectStep,
  onSubmit,
  saving,
  step,
  study,
}: {
  draft: PatientApplicationDraft;
  onBack: () => void;
  onChange: (draft: PatientApplicationDraft) => void;
  onNext: () => void;
  onSelectStep: (step: number) => void;
  onSubmit: () => void;
  saving: boolean;
  step: number;
  study: StudyProgram;
}) {
  const steps = ['Basic', 'Health', 'Availability'];

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <AppCard style={styles.cardGap}>
        <Text style={styles.sectionTitle}>{study.title}</Text>
        <Text style={styles.metaText}>
          Step {step + 1} of 3 | {steps[step]}
        </Text>
      </AppCard>
      <View style={styles.tabBar}>
        {steps.map((label, index) => (
          <PillButton
            key={label}
            active={step === index}
            label={label}
            onPress={() => onSelectStep(index)}
          />
        ))}
      </View>
      <AppCard style={styles.cardGap}>
        {step === 0 ? (
          <View style={styles.formStack}>
            <Field
              label="Name"
              placeholder="Jamie Brooks"
              value={draft.fullName}
              onChangeText={(value) =>
                onChange({ ...draft, fullName: value })
              }
            />
            <Field
              label="Age"
              keyboardType="numeric"
              placeholder="25"
              value={draft.age}
              onChangeText={(value) =>
                onChange({ ...draft, age: value })
              }
            />
            <Field
              label="City"
              placeholder="Cincinnati"
              value={draft.city}
              onChangeText={(value) =>
                onChange({ ...draft, city: value })
              }
            />
            <Field
              label="State"
              autoCapitalize="characters"
              placeholder="OH"
              value={draft.state}
              onChangeText={(value) =>
                onChange({ ...draft, state: value })
              }
            />
            <Field
              label="Phone"
              keyboardType="phone-pad"
              placeholder="(555) 555-5555"
              value={draft.phone}
              onChangeText={(value) =>
                onChange({ ...draft, phone: value })
              }
            />
            <Field
              autoCapitalize="none"
              keyboardType="email-address"
              label="Email"
              placeholder="you@example.com"
              value={draft.email}
              onChangeText={(value) =>
                onChange({ ...draft, email: value })
              }
            />
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.formStack}>
            <MultiLineField
              label="Condition"
              placeholder="Describe your condition or symptoms."
              value={draft.condition}
              onChangeText={(value) =>
                onChange({ ...draft, condition: value })
              }
            />
            <MultiLineField
              label="Current medications"
              placeholder="List medications or write none."
              value={draft.currentMedications}
              onChangeText={(value) =>
                onChange({
                  ...draft,
                  currentMedications: value,
                })
              }
            />
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.formStack}>
            <MultiLineField
              label="Availability"
              placeholder="When can you do calls, visits, or remote follow-ups?"
              value={draft.availability}
              onChangeText={(value) =>
                onChange({ ...draft, availability: value })
              }
            />
            <MultiLineField
              label="Why do you want to join?"
              placeholder="Short note about why this study is a fit."
              value={draft.motivation}
              onChangeText={(value) =>
                onChange({ ...draft, motivation: value })
              }
            />
          </View>
        ) : null}
      </AppCard>
      <View style={styles.actionRow}>
        <SecondaryButton label="Back" onPress={onBack} />
        {step < 2 ? (
          <PrimaryButton label="Next" onPress={onNext} />
        ) : (
          <PrimaryButton
            disabled={saving}
            label={saving ? 'Submitting...' : 'Submit application'}
            onPress={onSubmit}
          />
        )}
      </View>
    </ScrollView>
  );
}

function SubmittedView({
  application,
  onBackToStudies,
  onViewApplications,
  study,
}: {
  application: PatientApplication | null;
  onBackToStudies: () => void;
  onViewApplications: () => void;
  study: StudyProgram | null;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <AppCard style={styles.cardGap}>
        <Text style={styles.cardTitle}>Application submitted</Text>
        <Text style={styles.bodyText}>
          {study?.title ?? 'Your study'} has been submitted.
        </Text>
        <Badge
          label={prettyStatus(application?.status ?? 'submitted')}
          tone="accent"
        />
      </AppCard>
      <View style={styles.actionRow}>
        <PrimaryButton
          label="View my applications"
          onPress={onViewApplications}
        />
        <SecondaryButton
          label="Back to studies"
          onPress={onBackToStudies}
        />
      </View>
    </ScrollView>
  );
}

function ApplicationListView({
  accountMode,
  applications,
  onOpen,
  onRestore,
  patientEmail,
  restoreEmail,
  setRestoreEmail,
  studies,
}: {
  accountMode: 'auth' | 'demo';
  applications: PatientApplication[];
  onOpen: (applicationId: string) => void;
  onRestore: () => void;
  patientEmail: string | null;
  restoreEmail: string;
  setRestoreEmail: (value: string) => void;
  studies: StudyProgram[];
}) {
  if (
    !patientEmail &&
    accountMode === 'demo' &&
    applications.length === 0
  ) {
    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AppCard style={styles.cardGap}>
          <Text style={styles.sectionTitle}>
            Restore my applications
          </Text>
          <Field
            autoCapitalize="none"
            keyboardType="email-address"
            label="Email"
            placeholder="you@example.com"
            value={restoreEmail}
            onChangeText={setRestoreEmail}
          />
          <PrimaryButton label="Restore" onPress={onRestore} />
        </AppCard>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {!patientEmail && accountMode === 'demo' ? (
        <AppCard style={styles.cardGap}>
          <Text style={styles.sectionTitle}>
            Demo patient records
          </Text>
          <Text style={styles.bodyText}>
            Showing the seeded patient dataset for testing.
            Restore by email if you want to narrow this to one
            patient.
          </Text>
          <Field
            autoCapitalize="none"
            keyboardType="email-address"
            label="Restore applications by email"
            placeholder="you@example.com"
            value={restoreEmail}
            onChangeText={setRestoreEmail}
          />
          <PrimaryButton label="Restore" onPress={onRestore} />
        </AppCard>
      ) : null}

      {applications.length === 0 ? (
        <AppCard>
          <Text style={styles.bodyText}>
            {accountMode === 'auth'
              ? 'No applications on this account yet. Apply to a study and it will show up here.'
              : 'No applications found for this email yet.'}
          </Text>
        </AppCard>
      ) : (
        applications.map((application) => {
          const study = studies.find(
            (item) => item.id === application.studyId
          );

          return (
            <AppCard key={application.id} style={styles.cardGap}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>
                  {study?.title ?? 'Study'}
                </Text>
                <Badge
                  label={prettyStatus(application.status)}
                  tone={statusTone(application.status)}
                />
              </View>
              <Text style={styles.metaText}>
                Applied {formatDate(application.createdAt)}
              </Text>
              <Text style={styles.bodyText}>
                {application.condition}
              </Text>
              <SecondaryButton
                label="View application"
                onPress={() => onOpen(application.id)}
              />
            </AppCard>
          );
        })
      )}
    </ScrollView>
  );
}

function ApplicationDetailView({
  application,
  onBack,
  onEdit,
  onGoToRequests,
  requests,
  study,
}: {
  application: PatientApplication;
  onBack: () => void;
  onEdit: () => void;
  onGoToRequests: () => void;
  requests: ScreeningRequest[];
  study: StudyProgram | null;
}) {
  const timeline = buildTimeline(application, requests);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <AppCard style={styles.cardGap}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>
            {study?.title ?? 'Application'}
          </Text>
          <Badge
            label={prettyStatus(application.status)}
            tone={statusTone(application.status)}
          />
        </View>
        <Text style={styles.metaText}>{study?.condition}</Text>
        <Text style={styles.bodyText}>
          {application.fullName} | {application.email}
        </Text>
        {application.scheduledCallAt ? (
          <Text style={styles.requirementText}>
            Call scheduled for {application.scheduledCallAt}
          </Text>
        ) : null}
      </AppCard>

      <AppCard style={styles.cardGap}>
        <Text style={styles.sectionTitle}>Your answers</Text>
        <Text style={styles.detailLabel}>Condition</Text>
        <Text style={styles.bodyText}>{application.condition}</Text>
        <Text style={styles.detailLabel}>Current medications</Text>
        <Text style={styles.bodyText}>
          {application.currentMedications || 'None'}
        </Text>
        <Text style={styles.detailLabel}>Availability</Text>
        <Text style={styles.bodyText}>
          {application.availability}
        </Text>
        <Text style={styles.detailLabel}>Motivation</Text>
        <Text style={styles.bodyText}>
          {application.motivation}
        </Text>
      </AppCard>

      <AppCard style={styles.cardGap}>
        <Text style={styles.sectionTitle}>Timeline</Text>
        {timeline.map((item) => (
          <View key={item.id} style={styles.timelineItem}>
            <Text style={styles.timelineTitle}>{item.title}</Text>
            <Text style={styles.metaText}>{item.time}</Text>
          </View>
        ))}
      </AppCard>

      {requests.length > 0 ? (
        <AppCard style={styles.cardGap}>
          <Text style={styles.sectionTitle}>Requests from clinic</Text>
          {requests.map((request) => (
            <View key={request.id} style={styles.timelineItem}>
              <Text style={styles.timelineTitle}>
                {request.title}
              </Text>
              <Text style={styles.bodyText}>{request.body}</Text>
              <Text style={styles.metaText}>
                {request.status === 'open'
                  ? request.dueLabel
                  : 'Responded'}
              </Text>
            </View>
          ))}
          <SecondaryButton
            label="Open requests"
            onPress={onGoToRequests}
          />
        </AppCard>
      ) : null}

      <View style={styles.actionRow}>
        <SecondaryButton label="Back" onPress={onBack} />
        <PrimaryButton
          label="Update info"
          onPress={onEdit}
        />
      </View>
    </ScrollView>
  );
}

function RequestsView({
  applications,
  onOpenApplication,
  onRespond,
  requestResponses,
  requests,
  saving,
  setRequestResponses,
  studies,
}: {
  applications: PatientApplication[];
  onOpenApplication: (applicationId: string) => void;
  onRespond: (requestId: string) => void;
  requestResponses: Record<string, string>;
  requests: ScreeningRequest[];
  saving: boolean;
  setRequestResponses: Dispatch<
    SetStateAction<Record<string, string>>
  >;
  studies: StudyProgram[];
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {requests.length === 0 ? (
        <AppCard>
          <Text style={styles.bodyText}>
            No clinic requests right now.
          </Text>
        </AppCard>
      ) : (
        requests.map((request) => {
          const application = applications.find(
            (item) => item.id === request.applicationId
          );
          const study = studies.find(
            (item) => item.id === application?.studyId
          );

          return (
            <AppCard key={request.id} style={styles.cardGap}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>
                  {request.title}
                </Text>
                <Badge
                  label={request.status}
                  tone={
                    request.status === 'responded'
                      ? 'success'
                      : 'warning'
                  }
                />
              </View>
              <Text style={styles.metaText}>
                {study?.title ?? 'Study'}
              </Text>
              <Text style={styles.bodyText}>{request.body}</Text>
              <Text style={styles.requirementText}>
                {request.dueLabel}
              </Text>
              {request.status === 'responded' ? (
                <AppCard style={styles.responseCard}>
                  <Text style={styles.detailLabel}>Your response</Text>
                  <Text style={styles.bodyText}>
                    {request.patientResponse}
                  </Text>
                </AppCard>
              ) : (
                <>
                  <MultiLineField
                    label="Response"
                    placeholder="Type your response"
                    value={requestResponses[request.id] ?? ''}
                    onChangeText={(value) =>
                      setRequestResponses((current) => ({
                        ...current,
                        [request.id]: value,
                      }))
                    }
                  />
                  <View style={styles.actionRow}>
                    <PrimaryButton
                      disabled={saving}
                      label="Send response"
                      onPress={() => void onRespond(request.id)}
                    />
                    <SecondaryButton
                      label="Open application"
                      onPress={() =>
                        onOpenApplication(request.applicationId)
                      }
                    />
                  </View>
                </>
              )}
            </AppCard>
          );
        })
      )}
    </ScrollView>
  );
}

function ProfileView({
  accountMode,
  accountName,
  onClearSession,
  onRestore,
  patientEmail,
  restoreEmail,
  setRestoreEmail,
}: {
  accountMode: 'auth' | 'demo';
  accountName: string | null;
  onClearSession: () => void;
  onRestore: () => void;
  patientEmail: string | null;
  restoreEmail: string;
  setRestoreEmail: (value: string) => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <AppCard style={styles.cardGap}>
        <Text style={styles.sectionTitle}>
          {accountMode === 'auth' ? 'Account' : 'Profile'}
        </Text>
        {accountMode === 'auth' ? (
          <>
            <Text style={styles.bodyText}>
              Signed in as {accountName ?? 'StudyPulse user'}
            </Text>
            <Text style={styles.bodyText}>
              Email: {patientEmail ?? 'None'}
            </Text>
            <SecondaryButton
              label="Sign out"
              onPress={onClearSession}
            />
          </>
        ) : (
          <>
            <Text style={styles.bodyText}>
              Current email: {patientEmail ?? 'None'}
            </Text>
            <Field
              autoCapitalize="none"
              keyboardType="email-address"
              label="Restore applications by email"
              placeholder="you@example.com"
              value={restoreEmail}
              onChangeText={setRestoreEmail}
            />
            <PrimaryButton label="Restore" onPress={onRestore} />
            {patientEmail ? (
              <SecondaryButton
                label="Clear saved email"
                onPress={onClearSession}
              />
            ) : null}
          </>
        )}
      </AppCard>
    </ScrollView>
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

function statusTone(status: PatientApplication['status']) {
  switch (status) {
    case 'eligible':
      return 'success' as const;
    case 'under_review':
    case 'scheduled_call':
    case 'submitted':
      return 'accent' as const;
    case 'info_requested':
    case 'not_eligible':
    default:
      return 'warning' as const;
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

function matchStatusTone(status: StudyMatchResult['status']) {
  switch (status) {
    case 'likely_fit':
      return 'success' as const;
    case 'possible_fit':
      return 'accent' as const;
    case 'review_needed':
    case 'not_a_fit':
    default:
      return 'warning' as const;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function buildTimeline(
  application: PatientApplication,
  requests: ScreeningRequest[]
) {
  return [
    {
      id: `${application.id}-submitted`,
      title: 'Application submitted',
      time: formatDate(application.createdAt),
    },
    {
      id: `${application.id}-status`,
      title: `Status updated: ${prettyStatus(application.status)}`,
      time: formatDate(application.lastStatusAt),
    },
    ...requests.map((request) => ({
      id: request.id,
      title:
        request.status === 'responded'
          ? `You responded: ${request.title}`
          : `Clinic requested: ${request.title}`,
      time: formatDate(
        request.respondedAt ?? request.createdAt
      ),
    })),
  ];
}

function buildDefaultDraft(
  accountProfile?: StudyPulseProfile | null,
  patientEmail?: string | null
): PatientApplicationDraft {
  return {
    ...defaultApplicationDraft,
    fullName: accountProfile?.fullName ?? '',
    city: accountProfile?.city ?? '',
    state: accountProfile?.state ?? '',
    phone: accountProfile?.phone ?? '',
    email: patientEmail ?? accountProfile?.email ?? '',
  };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 12,
  },
  header: {
    paddingTop: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.secondaryText,
  },
  tabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 24,
  },
  cardGap: {
    gap: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },
  metaText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.primary,
    fontWeight: '700',
  },
  requirementText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.secondaryText,
  },
  actionRow: {
    gap: 10,
  },
  formStack: {
    gap: 12,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  timelineItem: {
    gap: 4,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  responseCard: {
    backgroundColor: '#F3F3F3',
  },
});
