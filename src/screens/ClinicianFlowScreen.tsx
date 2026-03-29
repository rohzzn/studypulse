import { useEffect, useMemo, useState } from 'react';
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
import { matchApplicantsWithGemini } from '../lib/geminiApplicantMatcher';
import {
  defaultClinicianRequestDraft,
  defaultScheduleCallDraft,
  defaultStudyDraft,
} from '../data/studypulseMockData';
import { colors } from '../theme/tokens';
import type {
  ActionResult,
  ApplicantMatchResult,
  ApplicationStatus,
  ClinicianProfile,
  ClinicianRequestDraft,
  PatientApplication,
  ScheduleCallDraft,
  ScreeningRequest,
  StudyDraft,
  StudyProgram,
} from '../types/studypulse';

type ClinicianTab = 'dashboard' | 'studies' | 'applicants';
type StudyView = 'list' | 'create' | 'detail';
type ApplicantView = 'list' | 'detail';

type ClinicianFlowScreenProps = {
  applications: PatientApplication[];
  clinician: ClinicianProfile | null;
  createRequest: (
    applicationId: string,
    draft: ClinicianRequestDraft
  ) => Promise<ActionResult>;
  createStudy: (
    draft: StudyDraft
  ) => Promise<ActionResult>;
  onRefresh: () => void;
  refreshing: boolean;
  requests: ScreeningRequest[];
  saveNotes: (
    applicationId: string,
    notes: string
  ) => Promise<ActionResult>;
  saving: boolean;
  scheduleCall: (
    applicationId: string,
    draft: ScheduleCallDraft
  ) => Promise<ActionResult>;
  studies: StudyProgram[];
  updateStatus: (
    applicationId: string,
    status: ApplicationStatus
  ) => Promise<ActionResult>;
};

export function ClinicianFlowScreen({
  applications,
  clinician,
  createRequest,
  createStudy,
  onRefresh,
  refreshing,
  requests,
  saveNotes,
  saving,
  scheduleCall,
  studies,
  updateStatus,
}: ClinicianFlowScreenProps) {
  const [activeTab, setActiveTab] =
    useState<ClinicianTab>('dashboard');
  const [studyView, setStudyView] =
    useState<StudyView>('list');
  const [applicantView, setApplicantView] =
    useState<ApplicantView>('list');
  const [selectedStudyId, setSelectedStudyId] =
    useState<string | null>(studies[0]?.id ?? null);
  const [selectedApplicationId, setSelectedApplicationId] =
    useState<string | null>(applications[0]?.id ?? null);
  const [studyDraft, setStudyDraft] =
    useState<StudyDraft>(defaultStudyDraft);
  const [requestDraft, setRequestDraft] =
    useState<ClinicianRequestDraft>(
      defaultClinicianRequestDraft
    );
  const [callDraft, setCallDraft] =
    useState<ScheduleCallDraft>(defaultScheduleCallDraft);
  const [notesDraft, setNotesDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | ApplicationStatus
  >('all');
  const [studyFilter, setStudyFilter] = useState<
    'all' | string
  >('all');
  const [applicantMatchQuery, setApplicantMatchQuery] =
    useState('');
  const [applicantMatches, setApplicantMatches] = useState<
    ApplicantMatchResult[]
  >([]);
  const [applicantMatchSource, setApplicantMatchSource] =
    useState<'gemini' | 'local' | null>(null);
  const [matchingApplicants, setMatchingApplicants] =
    useState(false);
  const [missingInfoOnly, setMissingInfoOnly] =
    useState(false);
  const [likelyEligibleOnly, setLikelyEligibleOnly] =
    useState(false);

  useEffect(() => {
    const firstStudy = studies[0];

    if (!selectedStudyId && firstStudy) {
      setSelectedStudyId(firstStudy.id);
    }
  }, [selectedStudyId, studies]);

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

  useEffect(() => {
    if (selectedApplication) {
      setNotesDraft(selectedApplication.clinicianNotes);
      setCallDraft({
        scheduledFor: selectedApplication.scheduledCallAt ?? '',
        note: selectedApplication.scheduledCallReason,
      });
      setRequestDraft(defaultClinicianRequestDraft);
    }
  }, [selectedApplication?.id]);

  const applicantMatchMap = useMemo(
    () =>
      new Map(
        applicantMatches.map((match) => [
          match.applicationId,
          match,
        ] as const)
      ),
    [applicantMatches]
  );

  const filteredApplications = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = applications.filter((application) => {
      const study = studies.find(
        (item) => item.id === application.studyId
      );
      const matchesStatus =
        statusFilter === 'all' ||
        application.status === statusFilter;
      const matchesStudy =
        studyFilter === 'all' ||
        application.studyId === studyFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          application.fullName,
          application.email,
          application.city,
          application.state,
          application.condition,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);

      const missingInfo =
        !application.currentMedications ||
        !application.availability ||
        !application.motivation;
      const fitsAge =
        study !== undefined &&
        application.age >= study.ageMin &&
        application.age <= study.ageMax;
      const likelyEligible =
        fitsAge &&
        application.status !== 'not_eligible' &&
        application.status !== 'scheduled_call';

      return (
        matchesStatus &&
        matchesStudy &&
        matchesSearch &&
        (!missingInfoOnly || missingInfo) &&
        (!likelyEligibleOnly || likelyEligible)
      );
    });

    if (applicantMatches.length === 0) {
      return filtered;
    }

    const allowedApplicationIds = new Set(
      applicantMatches
        .filter((match) => match.status !== 'not_a_fit')
        .map((match) => match.applicationId)
    );

    return filtered
      .filter((application) =>
        allowedApplicationIds.has(application.id)
      )
      .sort(
        (left, right) =>
          (applicantMatchMap.get(right.id)?.score ?? 0) -
          (applicantMatchMap.get(left.id)?.score ?? 0)
      );
  }, [
    applications,
    applicantMatchMap,
    applicantMatches,
    likelyEligibleOnly,
    missingInfoOnly,
    searchTerm,
    statusFilter,
    studies,
    studyFilter,
  ]);

  const selectedRequests = selectedApplication
    ? requests.filter(
        (request) =>
          request.applicationId === selectedApplication.id
      )
    : [];
  const selectedApplicationMatch = selectedApplication
    ? applicantMatchMap.get(selectedApplication.id) ?? null
    : null;

  useEffect(() => {
    const firstApplication = filteredApplications[0];

    if (
      firstApplication &&
      !filteredApplications.some(
        (application) => application.id === selectedApplicationId
      )
    ) {
      setSelectedApplicationId(firstApplication.id);
    }
  }, [filteredApplications, selectedApplicationId]);

  const screenTitle = useMemo(() => {
    if (activeTab === 'dashboard') {
      return 'Dashboard';
    }

    if (activeTab === 'studies') {
      if (studyView === 'create') {
        return 'Create study';
      }

      if (studyView === 'detail') {
        return 'Study detail';
      }

      return 'Studies';
    }

    return applicantView === 'detail'
      ? 'Applicant review'
      : 'Applicants';
  }, [activeTab, applicantView, studyView]);

  async function handleCreateStudy() {
    const result = await createStudy(studyDraft);

    if (result.ok) {
      setStudyDraft(defaultStudyDraft);
      if (result.studyId) {
        setSelectedStudyId(result.studyId);
      }
      setStudyView('list');
      setActiveTab('studies');
    }
  }

  async function handleSaveNotes() {
    if (!selectedApplication) {
      return;
    }

    await saveNotes(selectedApplication.id, notesDraft);
  }

  async function handleSendRequest() {
    if (!selectedApplication) {
      return;
    }

    const result = await createRequest(
      selectedApplication.id,
      requestDraft
    );

    if (result.ok) {
      setRequestDraft(defaultClinicianRequestDraft);
    }
  }

  async function handleScheduleCall() {
    if (!selectedApplication) {
      return;
    }

    await scheduleCall(selectedApplication.id, callDraft);
  }

  async function handleApplicantMatch() {
    if (!applicantMatchQuery.trim()) {
      setApplicantMatches([]);
      setApplicantMatchSource(null);
      return;
    }

    setMatchingApplicants(true);

    try {
      const result = await matchApplicantsWithGemini({
        applications,
        clinicianQuery: applicantMatchQuery,
        studies,
      });

      setApplicantMatches(result.matches);
      setApplicantMatchSource(result.source);

      const firstVisibleApplicant = result.matches.find(
        (match) => match.status !== 'not_a_fit'
      );

      if (firstVisibleApplicant) {
        setSelectedApplicationId(firstVisibleApplicant.applicationId);
      }
    } finally {
      setMatchingApplicants(false);
    }
  }

  function clearApplicantMatch() {
    setApplicantMatchQuery('');
    setApplicantMatches([]);
    setApplicantMatchSource(null);
  }

  const content = useMemo(() => {
    if (activeTab === 'dashboard') {
      return (
        <DashboardView
          applications={applications}
          clinician={clinician}
          onCreateStudy={() => {
            setActiveTab('studies');
            setStudyView('create');
          }}
          onOpenApplicants={() => {
            setActiveTab('applicants');
            setApplicantView('list');
          }}
          onRefresh={onRefresh}
          refreshing={refreshing}
          requests={requests}
          studies={studies}
        />
      );
    }

    if (activeTab === 'studies') {
      if (studyView === 'create') {
        return (
          <CreateStudyView
            draft={studyDraft}
            onBack={() => setStudyView('list')}
            onChange={setStudyDraft}
            onSubmit={handleCreateStudy}
            saving={saving}
          />
        );
      }

      if (studyView === 'detail' && selectedStudy) {
        return (
          <StudyAdminDetailView
            applicantCount={applications.filter(
              (application) =>
                application.studyId === selectedStudy.id
            ).length}
            onBack={() => setStudyView('list')}
            onOpenApplicants={() => {
              setStudyFilter(selectedStudy.id);
              setActiveTab('applicants');
              setApplicantView('list');
            }}
            study={selectedStudy}
          />
        );
      }

      return (
        <StudyListAdminView
          applications={applications}
          onCreateStudy={() => setStudyView('create')}
          onOpenApplicants={(studyId) => {
            setStudyFilter(studyId);
            setActiveTab('applicants');
            setApplicantView('list');
          }}
          onOpenStudy={(studyId) => {
            setSelectedStudyId(studyId);
            setStudyView('detail');
          }}
          studies={studies}
        />
      );
    }

    if (applicantView === 'detail' && selectedApplication) {
      return (
        <ApplicantDetailView
          application={selectedApplication}
          callDraft={callDraft}
          match={selectedApplicationMatch}
          notesDraft={notesDraft}
          onBack={() => setApplicantView('list')}
          onChangeCallDraft={setCallDraft}
          onChangeNotes={setNotesDraft}
          onChangeRequestDraft={setRequestDraft}
          onSaveNotes={handleSaveNotes}
          onScheduleCall={handleScheduleCall}
          onSendRequest={handleSendRequest}
          onUpdateStatus={(status) =>
            void updateStatus(selectedApplication.id, status)
          }
          requestDraft={requestDraft}
          requests={selectedRequests}
          saving={saving}
          study={
            studies.find(
              (study) =>
                study.id === selectedApplication.studyId
            ) ?? null
          }
        />
      );
    }

    return (
      <ApplicantsListView
        applications={filteredApplications}
        applicantMatchQuery={applicantMatchQuery}
        applicantMatches={applicantMatchMap}
        matchSource={applicantMatchSource}
        matchingApplicants={matchingApplicants}
        likelyEligibleOnly={likelyEligibleOnly}
        missingInfoOnly={missingInfoOnly}
        onChangeMatchQuery={setApplicantMatchQuery}
        onClearMatch={clearApplicantMatch}
        onOpenApplicant={(applicationId) => {
          setSelectedApplicationId(applicationId);
          setApplicantView('detail');
        }}
        onRunMatch={() => {
          void handleApplicantMatch();
        }}
        onToggleLikelyEligible={() =>
          setLikelyEligibleOnly((current) => !current)
        }
        onToggleMissingInfo={() =>
          setMissingInfoOnly((current) => !current)
        }
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setStatusFilter={setStatusFilter}
        setStudyFilter={setStudyFilter}
        statusFilter={statusFilter}
        studies={studies}
        studyFilter={studyFilter}
      />
    );
  }, [
    activeTab,
    applicantView,
    applications,
    applicantMatchMap,
    applicantMatchQuery,
    applicantMatchSource,
    callDraft,
    clinician,
    filteredApplications,
    matchingApplicants,
    likelyEligibleOnly,
    missingInfoOnly,
    notesDraft,
    onRefresh,
    refreshing,
    requestDraft,
    requests,
    saving,
    searchTerm,
    selectedApplication,
    selectedApplicationMatch,
    selectedRequests,
    selectedStudy,
    statusFilter,
    studies,
    studyDraft,
    studyFilter,
    studyView,
  ]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{screenTitle}</Text>
      </View>

      <View style={styles.tabBar}>
        <PillButton
          active={activeTab === 'dashboard'}
          label="Dashboard"
          onPress={() => {
            setActiveTab('dashboard');
          }}
        />
        <PillButton
          active={activeTab === 'studies'}
          label="Studies"
          onPress={() => {
            setActiveTab('studies');
            setStudyView('list');
          }}
        />
        <PillButton
          active={activeTab === 'applicants'}
          label="Applicants"
          onPress={() => {
            setActiveTab('applicants');
            setApplicantView('list');
          }}
        />
      </View>

      <View style={styles.content}>{content}</View>
    </View>
  );
}

function DashboardView({
  applications,
  clinician,
  onCreateStudy,
  onOpenApplicants,
  onRefresh,
  refreshing,
  requests,
  studies,
}: {
  applications: PatientApplication[];
  clinician: ClinicianProfile | null;
  onCreateStudy: () => void;
  onOpenApplicants: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  requests: ScreeningRequest[];
  studies: StudyProgram[];
}) {
  const metrics = [
    {
      label: 'Active studies',
      value: studies.filter(
        (study) => study.recruitStatus === 'open'
      ).length,
    },
    {
      label: 'New submissions',
      value: applications.filter(
        (application) => application.status === 'submitted'
      ).length,
    },
    {
      label: 'Pending follow-ups',
      value: requests.filter((request) => request.status === 'open')
        .length,
    },
    {
      label: 'Calls to schedule',
      value: applications.filter(
        (application) => application.status === 'eligible'
      ).length,
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <AppCard style={styles.cardGap}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.sectionTitle}>
              {clinician?.fullName ?? 'Clinical team'}
            </Text>
            <Text style={styles.metaText}>
              {clinician?.siteName ?? 'StudyPulse'}
            </Text>
          </View>
          <SecondaryButton
            label={refreshing ? 'Refreshing...' : 'Refresh'}
            onPress={onRefresh}
          />
        </View>
      </AppCard>

      <View style={styles.metricGrid}>
        {metrics.map((metric) => (
          <AppCard key={metric.label} style={styles.cardGap}>
            <Text style={styles.metaText}>{metric.label}</Text>
            <Text style={styles.metricValue}>{metric.value}</Text>
          </AppCard>
        ))}
      </View>

      <AppCard style={styles.cardGap}>
        <Text style={styles.sectionTitle}>Main actions</Text>
        <PrimaryButton label="Create study" onPress={onCreateStudy} />
        <SecondaryButton
          label="Open applicants"
          onPress={onOpenApplicants}
        />
      </AppCard>
    </ScrollView>
  );
}

function StudyListAdminView({
  applications,
  onCreateStudy,
  onOpenApplicants,
  onOpenStudy,
  studies,
}: {
  applications: PatientApplication[];
  onCreateStudy: () => void;
  onOpenApplicants: (studyId: string) => void;
  onOpenStudy: (studyId: string) => void;
  studies: StudyProgram[];
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <AppCard style={styles.cardGap}>
        <PrimaryButton label="Create study" onPress={onCreateStudy} />
      </AppCard>

      {studies.map((study) => (
        <AppCard key={study.id} style={styles.cardGap}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{study.title}</Text>
            <Badge
              label={study.recruitStatus}
              tone={
                study.recruitStatus === 'open'
                  ? 'success'
                  : 'warning'
              }
            />
          </View>
          <Text style={styles.metaText}>{study.condition}</Text>
          <Text style={styles.bodyText}>{study.locationLabel}</Text>
          <Text style={styles.bodyText}>
            Applicants:{' '}
            {
              applications.filter(
                (application) => application.studyId === study.id
              ).length
            }
          </Text>
          <SecondaryButton
            label="Open study"
            onPress={() => onOpenStudy(study.id)}
          />
          <SecondaryButton
            label="Open applicants"
            onPress={() => onOpenApplicants(study.id)}
          />
        </AppCard>
      ))}
    </ScrollView>
  );
}

function StudyAdminDetailView({
  applicantCount,
  onBack,
  onOpenApplicants,
  study,
}: {
  applicantCount: number;
  onBack: () => void;
  onOpenApplicants: () => void;
  study: StudyProgram;
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
      </AppCard>
      <AppCard style={styles.cardGap}>
        <Text style={styles.sectionTitle}>Study requirements</Text>
        <Text style={styles.bodyText}>{study.requirements}</Text>
        <Text style={styles.metaText}>
          Age {study.ageMin}-{study.ageMax}
        </Text>
        <Text style={styles.metaText}>{study.locationLabel}</Text>
        <Text style={styles.metaText}>
          {study.timeCommitment}
        </Text>
      </AppCard>
      <AppCard style={styles.cardGap}>
        <Text style={styles.sectionTitle}>Applicants</Text>
        <Text style={styles.metricValue}>{applicantCount}</Text>
      </AppCard>
      <View style={styles.actionRow}>
        <PrimaryButton
          label="Open applicants"
          onPress={onOpenApplicants}
        />
        <SecondaryButton label="Back" onPress={onBack} />
      </View>
    </ScrollView>
  );
}

function CreateStudyView({
  draft,
  onBack,
  onChange,
  onSubmit,
  saving,
}: {
  draft: StudyDraft;
  onBack: () => void;
  onChange: (draft: StudyDraft) => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <AppCard style={styles.cardGap}>
        <Text style={styles.sectionTitle}>Basic info</Text>
        <Field
          label="Study title"
          placeholder="HeartWell Remote Screening Trial"
          value={draft.title}
          onChangeText={(value) =>
            onChange({ ...draft, title: value })
          }
        />
        <Field
          label="Condition"
          placeholder="Heart palpitations and rhythm monitoring"
          value={draft.condition}
          onChangeText={(value) =>
            onChange({ ...draft, condition: value })
          }
        />
        <Field
          label="Short summary"
          placeholder="Short study card summary"
          value={draft.shortDescription}
          onChangeText={(value) =>
            onChange({
              ...draft,
              shortDescription: value,
            })
          }
        />
        <MultiLineField
          label="Description"
          placeholder="Describe the study in one short paragraph."
          value={draft.description}
          onChangeText={(value) =>
            onChange({ ...draft, description: value })
          }
        />
      </AppCard>

      <AppCard style={styles.cardGap}>
        <Text style={styles.sectionTitle}>Eligibility</Text>
        <MultiLineField
          label="Eligibility summary"
          placeholder="Who is this study for?"
          value={draft.eligibilitySummary}
          onChangeText={(value) =>
            onChange({
              ...draft,
              eligibilitySummary: value,
            })
          }
        />
        <MultiLineField
          label="Requirements"
          placeholder="Key requirements and exclusions"
          value={draft.requirements}
          onChangeText={(value) =>
            onChange({ ...draft, requirements: value })
          }
        />
        <View style={styles.inlineFields}>
          <View style={styles.inlineField}>
            <Field
              label="Age min"
              placeholder="18"
              value={draft.ageMin}
              onChangeText={(value) =>
                onChange({ ...draft, ageMin: value })
              }
            />
          </View>
          <View style={styles.inlineField}>
            <Field
              label="Age max"
              placeholder="65"
              value={draft.ageMax}
              onChangeText={(value) =>
                onChange({ ...draft, ageMax: value })
              }
            />
          </View>
        </View>
        <MultiLineField
          label="Medication exclusions"
          placeholder="Medication notes or exclusions"
          value={draft.medicationsExclusions}
          onChangeText={(value) =>
            onChange({
              ...draft,
              medicationsExclusions: value,
            })
          }
        />
      </AppCard>

      <AppCard style={styles.cardGap}>
        <Text style={styles.sectionTitle}>Operations</Text>
        <Field
          label="Location"
          placeholder="Cincinnati clinic + remote follow-ups"
          value={draft.locationLabel}
          onChangeText={(value) =>
            onChange({ ...draft, locationLabel: value })
          }
        />
        <View style={styles.filterGroup}>
          <PillButton
            active={draft.locationType === 'remote'}
            label="Remote"
            onPress={() =>
              onChange({ ...draft, locationType: 'remote' })
            }
          />
          <PillButton
            active={draft.locationType === 'hybrid'}
            label="Hybrid"
            onPress={() =>
              onChange({ ...draft, locationType: 'hybrid' })
            }
          />
          <PillButton
            active={draft.locationType === 'in_person'}
            label="In person"
            onPress={() =>
              onChange({
                ...draft,
                locationType: 'in_person',
              })
            }
          />
        </View>
        <Field
          label="Time commitment"
          placeholder="1 call, 1 visit, 2 follow-ups"
          value={draft.timeCommitment}
          onChangeText={(value) =>
            onChange({ ...draft, timeCommitment: value })
          }
        />
        <MultiLineField
          label="Availability requirements"
          placeholder="Call, visit, or calendar requirements"
          value={draft.availabilityRequirements}
          onChangeText={(value) =>
            onChange({
              ...draft,
              availabilityRequirements: value,
            })
          }
        />
        <Field
          label="Study type"
          placeholder="Cardiology screening"
          value={draft.studyType}
          onChangeText={(value) =>
            onChange({ ...draft, studyType: value })
          }
        />
        <View style={styles.filterGroup}>
          <PillButton
            active={draft.recruitStatus === 'open'}
            label="Open"
            onPress={() =>
              onChange({ ...draft, recruitStatus: 'open' })
            }
          />
          <PillButton
            active={draft.recruitStatus === 'closed'}
            label="Closed"
            onPress={() =>
              onChange({ ...draft, recruitStatus: 'closed' })
            }
          />
        </View>
      </AppCard>

      <View style={styles.actionRow}>
        <SecondaryButton label="Back" onPress={onBack} />
        <PrimaryButton
          disabled={saving}
          label={saving ? 'Publishing...' : 'Publish study'}
          onPress={onSubmit}
        />
      </View>
    </ScrollView>
  );
}

function ApplicantsListView({
  applications,
  applicantMatchQuery,
  applicantMatches,
  matchSource,
  matchingApplicants,
  likelyEligibleOnly,
  missingInfoOnly,
  onChangeMatchQuery,
  onClearMatch,
  onOpenApplicant,
  onRunMatch,
  onToggleLikelyEligible,
  onToggleMissingInfo,
  searchTerm,
  setSearchTerm,
  setStatusFilter,
  setStudyFilter,
  statusFilter,
  studies,
  studyFilter,
}: {
  applications: PatientApplication[];
  applicantMatchQuery: string;
  applicantMatches: Map<string, ApplicantMatchResult>;
  matchSource: 'gemini' | 'local' | null;
  matchingApplicants: boolean;
  likelyEligibleOnly: boolean;
  missingInfoOnly: boolean;
  onChangeMatchQuery: (value: string) => void;
  onClearMatch: () => void;
  onOpenApplicant: (applicationId: string) => void;
  onRunMatch: () => void;
  onToggleLikelyEligible: () => void;
  onToggleMissingInfo: () => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  setStatusFilter: (
    value: 'all' | ApplicationStatus
  ) => void;
  setStudyFilter: (value: 'all' | string) => void;
  statusFilter: 'all' | ApplicationStatus;
  studies: StudyProgram[];
  studyFilter: 'all' | string;
}) {
  const statusOptions: Array<{
    label: string;
    value: 'all' | ApplicationStatus;
  }> = [
    { label: 'All', value: 'all' },
    { label: 'Submitted', value: 'submitted' },
    { label: 'Review', value: 'under_review' },
    { label: 'Needs info', value: 'info_requested' },
    { label: 'Eligible', value: 'eligible' },
    { label: 'Not eligible', value: 'not_eligible' },
    { label: 'Call scheduled', value: 'scheduled_call' },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <AppCard style={styles.cardGap}>
        <Text style={styles.sectionTitle}>AI applicant filter</Text>
        <Text style={styles.bodyText}>
          Ask for the kind of applicants you want to review in plain English.
        </Text>
        <MultiLineField
          label="What should StudyPulse surface?"
          placeholder="Show me migraine applicants in Ohio who look eligible and still need follow-up."
          value={applicantMatchQuery}
          onChangeText={onChangeMatchQuery}
        />
        <PrimaryButton
          disabled={matchingApplicants}
          label={
            matchingApplicants
              ? 'Filtering...'
              : 'Filter applicants with AI'
          }
          onPress={onRunMatch}
        />
        {applicantMatchQuery ? (
          <SecondaryButton
            label="Clear AI filter"
            onPress={onClearMatch}
          />
        ) : null}
        {matchSource ? (
          <Text style={styles.requirementText}>
            Showing ranked applicants from{' '}
            {matchSource === 'gemini'
              ? 'Gemini'
              : 'local fallback'}
            .
          </Text>
        ) : null}
      </AppCard>

      <AppCard style={styles.cardGap}>
        <Field
          label="Search"
          placeholder="Search by name, email, location, or condition"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <Text style={styles.detailLabel}>Status</Text>
        <View style={styles.filterGroup}>
          {statusOptions.map((option) => (
            <PillButton
              key={option.value}
              active={statusFilter === option.value}
              label={option.label}
              onPress={() => setStatusFilter(option.value)}
            />
          ))}
        </View>
        <Text style={styles.detailLabel}>Study</Text>
        <View style={styles.filterGroup}>
          <PillButton
            active={studyFilter === 'all'}
            label="All studies"
            onPress={() => setStudyFilter('all')}
          />
          {studies.map((study) => (
            <PillButton
              key={study.id}
              active={studyFilter === study.id}
              label={study.title}
              onPress={() => setStudyFilter(study.id)}
            />
          ))}
        </View>
        <View style={styles.filterGroup}>
          <PillButton
            active={missingInfoOnly}
            label="Missing info"
            onPress={onToggleMissingInfo}
          />
          <PillButton
            active={likelyEligibleOnly}
            label="Likely eligible"
            onPress={onToggleLikelyEligible}
          />
        </View>
      </AppCard>

      {applications.length === 0 ? (
        <AppCard>
          <Text style={styles.bodyText}>
            No applicants match these filters.
          </Text>
        </AppCard>
      ) : null}

      {applications.map((application) => {
        const study = studies.find(
          (item) => item.id === application.studyId
        );

        return (
          <AppCard key={application.id} style={styles.cardGap}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>
                {application.fullName}
              </Text>
              <Badge
                label={prettyStatus(application.status)}
                tone={statusTone(application.status)}
              />
            </View>
            <Text style={styles.metaText}>
              {study?.title ?? 'Study'}
            </Text>
            <Text style={styles.bodyText}>
              {application.age} / {application.city}, {application.state}
            </Text>
            <Text style={styles.bodyText}>
              {application.condition}
            </Text>
            {applicantMatches.get(application.id) ? (
              <>
                <Text style={styles.bodyText}>
                  {
                    applicantMatches.get(application.id)?.reason
                  }
                </Text>
                <Text style={styles.requirementText}>
                  {
                    applicantMatches.get(application.id)?.caution
                  }
                </Text>
              </>
            ) : null}
            <Text style={styles.requirementText}>
              Applied {formatDate(application.createdAt)}
            </Text>
            <SecondaryButton
              label="Open applicant"
              onPress={() => onOpenApplicant(application.id)}
            />
          </AppCard>
        );
      })}
    </ScrollView>
  );
}

function ApplicantDetailView({
  application,
  callDraft,
  match,
  notesDraft,
  onBack,
  onChangeCallDraft,
  onChangeNotes,
  onChangeRequestDraft,
  onSaveNotes,
  onScheduleCall,
  onSendRequest,
  onUpdateStatus,
  requestDraft,
  requests,
  saving,
  study,
}: {
  application: PatientApplication;
  callDraft: ScheduleCallDraft;
  match: ApplicantMatchResult | null;
  notesDraft: string;
  onBack: () => void;
  onChangeCallDraft: (draft: ScheduleCallDraft) => void;
  onChangeNotes: (value: string) => void;
  onChangeRequestDraft: (
    draft: ClinicianRequestDraft
  ) => void;
  onSaveNotes: () => void;
  onScheduleCall: () => void;
  onSendRequest: () => void;
  onUpdateStatus: (status: ApplicationStatus) => void;
  requestDraft: ClinicianRequestDraft;
  requests: ScreeningRequest[];
  saving: boolean;
  study: StudyProgram | null;
}) {
  const statusOptions: ApplicationStatus[] = [
    'submitted',
    'under_review',
    'info_requested',
    'eligible',
    'not_eligible',
    'scheduled_call',
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <AppCard style={styles.cardGap}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>
            {application.fullName}
          </Text>
          <Badge
            label={prettyStatus(application.status)}
            tone={statusTone(application.status)}
          />
        </View>
        <Text style={styles.metaText}>
          {study?.title ?? 'Study'}
        </Text>
        <Text style={styles.bodyText}>
          {application.email} / {application.phone}
        </Text>
        <Text style={styles.bodyText}>
          {application.age} / {application.city}, {application.state}
        </Text>
      </AppCard>

      {match ? (
        <AppCard style={styles.cardGap}>
          <Text style={styles.sectionTitle}>AI fit summary</Text>
          <Badge
            label={prettyMatchStatus(match.status)}
            tone={matchStatusTone(match.status)}
          />
          <Text style={styles.bodyText}>{match.reason}</Text>
          <Text style={styles.requirementText}>
            {match.caution}
          </Text>
        </AppCard>
      ) : null}

      <AppCard style={styles.cardGap}>
        <Text style={styles.sectionTitle}>Study fit</Text>
        <Text style={styles.detailLabel}>Study</Text>
        <Text style={styles.bodyText}>
          {study?.eligibilitySummary ?? 'No study selected.'}
        </Text>
        <Text style={styles.detailLabel}>Age range</Text>
        <Text style={styles.bodyText}>
          {study ? `${study.ageMin}-${study.ageMax}` : 'N/A'}
        </Text>
        <Text style={styles.detailLabel}>Patient condition</Text>
        <Text style={styles.bodyText}>{application.condition}</Text>
      </AppCard>

      <AppCard style={styles.cardGap}>
        <Text style={styles.sectionTitle}>Submitted answers</Text>
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
        <Text style={styles.sectionTitle}>Update status</Text>
        <View style={styles.filterGroup}>
          {statusOptions.map((status) => (
            <PillButton
              key={status}
              active={application.status === status}
              label={prettyStatus(status)}
              onPress={() => onUpdateStatus(status)}
            />
          ))}
        </View>
      </AppCard>

      <AppCard style={styles.cardGap}>
        <Text style={styles.sectionTitle}>Coordinator notes</Text>
        <MultiLineField
          label="Notes"
          placeholder="Private coordinator notes"
          value={notesDraft}
          onChangeText={onChangeNotes}
        />
        <PrimaryButton
          disabled={saving}
          label={saving ? 'Saving...' : 'Save notes'}
          onPress={onSaveNotes}
        />
      </AppCard>

      <AppCard style={styles.cardGap}>
        <Text style={styles.sectionTitle}>Request more info</Text>
        <Field
          label="Request title"
          placeholder="Confirm medication history"
          value={requestDraft.title}
          onChangeText={(value) =>
            onChangeRequestDraft({
              ...requestDraft,
              title: value,
            })
          }
        />
        <MultiLineField
          label="Question"
          placeholder="What does the patient need to send back?"
          value={requestDraft.body}
          onChangeText={(value) =>
            onChangeRequestDraft({
              ...requestDraft,
              body: value,
            })
          }
        />
        <Field
          label="Deadline"
          placeholder="Due in 48 hours"
          value={requestDraft.dueLabel}
          onChangeText={(value) =>
            onChangeRequestDraft({
              ...requestDraft,
              dueLabel: value,
            })
          }
        />
        <PrimaryButton
          disabled={saving}
          label={saving ? 'Sending...' : 'Send request'}
          onPress={onSendRequest}
        />
      </AppCard>

      <AppCard style={styles.cardGap}>
        <Text style={styles.sectionTitle}>Schedule call</Text>
        <Field
          label="Call time"
          placeholder="2026-03-31 10:30 AM EDT"
          value={callDraft.scheduledFor}
          onChangeText={(value) =>
            onChangeCallDraft({
              ...callDraft,
              scheduledFor: value,
            })
          }
        />
        <MultiLineField
          label="Reason or notes"
          placeholder="Why are you scheduling this call?"
          value={callDraft.note}
          onChangeText={(value) =>
            onChangeCallDraft({
              ...callDraft,
              note: value,
            })
          }
        />
        <PrimaryButton
          disabled={saving}
          label={saving ? 'Scheduling...' : 'Schedule call'}
          onPress={onScheduleCall}
        />
      </AppCard>

      <AppCard style={styles.cardGap}>
        <Text style={styles.sectionTitle}>Request history</Text>
        {requests.length === 0 ? (
          <Text style={styles.bodyText}>
            No requests sent yet.
          </Text>
        ) : (
          requests.map((request) => (
            <View key={request.id} style={styles.timelineItem}>
              <View style={styles.rowBetween}>
                <Text style={styles.timelineTitle}>
                  {request.title}
                </Text>
                <Badge
                  label={
                    request.status === 'responded'
                      ? 'Responded'
                      : 'Open'
                  }
                  tone={
                    request.status === 'responded'
                      ? 'success'
                      : 'warning'
                  }
                />
              </View>
              <Text style={styles.bodyText}>{request.body}</Text>
              <Text style={styles.requirementText}>
                {request.dueLabel}
              </Text>
              {request.patientResponse ? (
                <Text style={styles.bodyText}>
                  Patient: {request.patientResponse}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </AppCard>

      <SecondaryButton label="Back" onPress={onBack} />
    </ScrollView>
  );
}

function prettyStatus(status: ApplicationStatus) {
  switch (status) {
    case 'under_review':
      return 'Under review';
    case 'info_requested':
      return 'Needs info';
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

function statusTone(status: ApplicationStatus) {
  switch (status) {
    case 'eligible':
      return 'success' as const;
    case 'submitted':
    case 'under_review':
    case 'scheduled_call':
      return 'accent' as const;
    case 'info_requested':
    case 'not_eligible':
    default:
      return 'warning' as const;
  }
}

function prettyMatchStatus(status: ApplicantMatchResult['status']) {
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

function matchStatusTone(status: ApplicantMatchResult['status']) {
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 12,
  },
  header: {
    paddingTop: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.6,
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
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.8,
  },
  actionRow: {
    gap: 10,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  filterGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  inlineFields: {
    flexDirection: 'row',
    gap: 10,
  },
  inlineField: {
    flex: 1,
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
});
