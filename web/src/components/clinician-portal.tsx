import { useEffect, useMemo, useState } from 'react';

import {
  Button,
  Card,
  EmptyState,
  Input,
  Pill,
  TextArea,
} from './ui';
import {
  defaultClinicianRequestDraft,
  defaultScheduleCallDraft,
  defaultStudyDraft,
  type ApplicationStatus,
  type ClinicianRequestDraft,
  type PatientApplication,
  type Profile,
  type ScheduleCallDraft,
  type ScreeningRequest,
  type StudyDraft,
  type StudyProgram,
} from '../lib/types';

type ClinicianPortalProps = {
  applications: PatientApplication[];
  busy: boolean;
  onCreateRequest: (
    applicationId: string,
    draft: ClinicianRequestDraft
  ) => Promise<void>;
  onCreateStudy: (draft: StudyDraft) => Promise<void>;
  onSaveNotes: (
    applicationId: string,
    notes: string
  ) => Promise<void>;
  onScheduleCall: (
    applicationId: string,
    draft: ScheduleCallDraft
  ) => Promise<void>;
  onUpdateStatus: (
    applicationId: string,
    status: ApplicationStatus
  ) => Promise<void>;
  profile: Profile;
  requests: ScreeningRequest[];
  studies: StudyProgram[];
};

type ClinicianTab = 'dashboard' | 'studies' | 'applicants';

export function ClinicianPortal({
  applications,
  busy,
  onCreateRequest,
  onCreateStudy,
  onSaveNotes,
  onScheduleCall,
  onUpdateStatus,
  profile,
  requests,
  studies,
}: ClinicianPortalProps) {
  const [tab, setTab] = useState<ClinicianTab>('dashboard');
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
  const [studyFilter, setStudyFilter] = useState<
    'all' | string
  >('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | ApplicationStatus
  >('all');
  const [missingInfoOnly, setMissingInfoOnly] =
    useState(false);
  const [likelyEligibleOnly, setLikelyEligibleOnly] =
    useState(false);

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

  const selectedStudy =
    studies.find((study) => study.id === selectedStudyId) ??
    null;
  const selectedApplication =
    applications.find(
      (application) =>
        application.id === selectedApplicationId
    ) ?? null;

  useEffect(() => {
    if (selectedApplication) {
      setNotesDraft(selectedApplication.clinicianNotes);
      setCallDraft({
        scheduledFor: selectedApplication.scheduledCallAt ?? '',
        note: selectedApplication.scheduledCallReason,
      });
    }
  }, [selectedApplication]);

  const filteredApplications = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return applications.filter((application) => {
      const study = studies.find(
        (item) => item.id === application.studyId
      );
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
      const matchesStudy =
        studyFilter === 'all' ||
        application.studyId === studyFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        application.status === statusFilter;
      const missingInfo =
        !application.currentMedications ||
        !application.availability ||
        !application.motivation;
      const likelyEligible =
        study !== undefined &&
        application.age >= study.ageMin &&
        application.age <= study.ageMax &&
        application.status !== 'not_eligible';

      return (
        matchesSearch &&
        matchesStudy &&
        matchesStatus &&
        (!missingInfoOnly || missingInfo) &&
        (!likelyEligibleOnly || likelyEligible)
      );
    });
  }, [
    applications,
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

  return (
    <div className="portal-stack">
      <section className="portal-hero">
        <div>
          <p className="eyebrow">Clinician portal</p>
          <h1>{profile.siteName || 'StudyPulse Research Network'}</h1>
          <p>
            Publish studies, review candidates, request follow-up
            details, and schedule screening calls.
          </p>
        </div>
        <div className="hero-metrics">
          <Card>
            <span className="metric-label">Active studies</span>
            <strong>
              {studies.filter((study) => study.recruitStatus === 'open').length}
            </strong>
          </Card>
          <Card>
            <span className="metric-label">Applicants</span>
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
        <Pill active={tab === 'dashboard'} onClick={() => setTab('dashboard')}>
          Dashboard
        </Pill>
        <Pill active={tab === 'studies'} onClick={() => setTab('studies')}>
          Studies
        </Pill>
        <Pill
          active={tab === 'applicants'}
          onClick={() => setTab('applicants')}
        >
          Applicants
        </Pill>
      </div>

      {tab === 'dashboard' ? (
        <DashboardPanel
          profile={profile}
          requests={requests}
          studies={studies}
          submittedCount={
            applications.filter(
              (application) => application.status === 'submitted'
            ).length
          }
          eligibleCount={
            applications.filter(
              (application) => application.status === 'eligible'
            ).length
          }
        />
      ) : null}

      {tab === 'studies' ? (
        <StudiesAdminPanel
          busy={busy}
          draft={studyDraft}
          onChange={setStudyDraft}
          onCreateStudy={async () => {
            await onCreateStudy(studyDraft);
            setStudyDraft(defaultStudyDraft);
          }}
          onOpenApplicants={(studyId) => {
            setStudyFilter(studyId);
            setTab('applicants');
          }}
          onOpenStudy={setSelectedStudyId}
          selectedStudy={selectedStudy}
          studies={studies}
          totalApplicants={applications}
        />
      ) : null}

      {tab === 'applicants' ? (
        <ApplicantsPanel
          applications={filteredApplications}
          busy={busy}
          callDraft={callDraft}
          missingInfoOnly={missingInfoOnly}
          notesDraft={notesDraft}
          onChangeCallDraft={setCallDraft}
          onChangeNotes={setNotesDraft}
          onChangeRequestDraft={setRequestDraft}
          onOpenApplicant={setSelectedApplicationId}
          onSaveNotes={async () => {
            if (!selectedApplication) {
              return;
            }

            await onSaveNotes(selectedApplication.id, notesDraft);
          }}
          onScheduleCall={async () => {
            if (!selectedApplication) {
              return;
            }

            await onScheduleCall(selectedApplication.id, callDraft);
          }}
          onSendRequest={async () => {
            if (!selectedApplication) {
              return;
            }

            await onCreateRequest(
              selectedApplication.id,
              requestDraft
            );
            setRequestDraft(defaultClinicianRequestDraft);
          }}
          onToggleLikelyEligible={() =>
            setLikelyEligibleOnly((current) => !current)
          }
          onToggleMissingInfo={() =>
            setMissingInfoOnly((current) => !current)
          }
          onUpdateStatus={async (status) => {
            if (!selectedApplication) {
              return;
            }

            await onUpdateStatus(selectedApplication.id, status);
          }}
          requestDraft={requestDraft}
          requests={selectedRequests}
          searchTerm={searchTerm}
          selectedApplication={selectedApplication}
          setSearchTerm={setSearchTerm}
          setStatusFilter={setStatusFilter}
          setStudyFilter={setStudyFilter}
          statusFilter={statusFilter}
          studies={studies}
          studyFilter={studyFilter}
          likelyEligibleOnly={likelyEligibleOnly}
        />
      ) : null}
    </div>
  );
}

function DashboardPanel({
  eligibleCount,
  profile,
  requests,
  studies,
  submittedCount,
}: {
  eligibleCount: number;
  profile: Profile;
  requests: ScreeningRequest[];
  studies: StudyProgram[];
  submittedCount: number;
}) {
  return (
    <div className="dashboard-grid">
      <Card className="detail-card">
        <p className="eyebrow">Coordinator</p>
        <h2>{profile.fullName || 'Clinical team'}</h2>
        <p>
          {profile.title || 'Clinical Research Coordinator'} at{' '}
          {profile.siteName || 'StudyPulse Research Network'}
        </p>
      </Card>
      <Card>
        <span className="metric-label">Active studies</span>
        <strong>{studies.length}</strong>
      </Card>
      <Card>
        <span className="metric-label">New submissions</span>
        <strong>{submittedCount}</strong>
      </Card>
      <Card>
        <span className="metric-label">Pending follow-ups</span>
        <strong>
          {requests.filter((request) => request.status === 'open').length}
        </strong>
      </Card>
      <Card>
        <span className="metric-label">Ready for calls</span>
        <strong>{eligibleCount}</strong>
      </Card>
    </div>
  );
}

function StudiesAdminPanel({
  busy,
  draft,
  onChange,
  onCreateStudy,
  onOpenApplicants,
  onOpenStudy,
  selectedStudy,
  studies,
  totalApplicants,
}: {
  busy: boolean;
  draft: StudyDraft;
  onChange: (draft: StudyDraft) => void;
  onCreateStudy: () => Promise<void>;
  onOpenApplicants: (studyId: string) => void;
  onOpenStudy: (studyId: string) => void;
  selectedStudy: StudyProgram | null;
  studies: StudyProgram[];
  totalApplicants: PatientApplication[];
}) {
  return (
    <div className="layout-grid">
      <div className="stack">
        <Card className="detail-card">
          <p className="eyebrow">Create study</p>
          <h2>Publish a new study</h2>
          <Input
            label="Study title"
            placeholder="HeartWell Remote Screening Trial"
            value={draft.title}
            onChange={(value) =>
              onChange({ ...draft, title: value })
            }
          />
          <Input
            label="Condition"
            placeholder="Heart palpitations and rhythm monitoring"
            value={draft.condition}
            onChange={(value) =>
              onChange({ ...draft, condition: value })
            }
          />
          <TextArea
            label="Short summary"
            placeholder="Short study card summary"
            value={draft.shortDescription}
            onChange={(value) =>
              onChange({
                ...draft,
                shortDescription: value,
              })
            }
          />
          <TextArea
            label="Description"
            placeholder="Describe the study in one paragraph."
            value={draft.description}
            onChange={(value) =>
              onChange({ ...draft, description: value })
            }
          />
          <TextArea
            label="Eligibility summary"
            placeholder="Who is this study for?"
            value={draft.eligibilitySummary}
            onChange={(value) =>
              onChange({
                ...draft,
                eligibilitySummary: value,
              })
            }
          />
          <TextArea
            label="Requirements"
            placeholder="Key requirements"
            value={draft.requirements}
            onChange={(value) =>
              onChange({ ...draft, requirements: value })
            }
          />
          <div className="two-col">
            <Input
              label="Age min"
              placeholder="18"
              value={draft.ageMin}
              onChange={(value) =>
                onChange({ ...draft, ageMin: value })
              }
            />
            <Input
              label="Age max"
              placeholder="65"
              value={draft.ageMax}
              onChange={(value) =>
                onChange({ ...draft, ageMax: value })
              }
            />
          </div>
          <Input
            label="Location"
            placeholder="Cincinnati clinic + remote follow-ups"
            value={draft.locationLabel}
            onChange={(value) =>
              onChange({ ...draft, locationLabel: value })
            }
          />
          <div className="tab-row">
            <Pill
              active={draft.locationType === 'remote'}
              onClick={() =>
                onChange({ ...draft, locationType: 'remote' })
              }
            >
              Remote
            </Pill>
            <Pill
              active={draft.locationType === 'hybrid'}
              onClick={() =>
                onChange({ ...draft, locationType: 'hybrid' })
              }
            >
              Hybrid
            </Pill>
            <Pill
              active={draft.locationType === 'in_person'}
              onClick={() =>
                onChange({
                  ...draft,
                  locationType: 'in_person',
                })
              }
            >
              In person
            </Pill>
          </div>
          <Input
            label="Time commitment"
            placeholder="1 call, 1 visit, 2 follow-ups"
            value={draft.timeCommitment}
            onChange={(value) =>
              onChange({ ...draft, timeCommitment: value })
            }
          />
          <TextArea
            label="Availability requirements"
            placeholder="Call or visit requirements"
            value={draft.availabilityRequirements}
            onChange={(value) =>
              onChange({
                ...draft,
                availabilityRequirements: value,
              })
            }
          />
          <TextArea
            label="Medication exclusions"
            placeholder="Medication notes or exclusions"
            value={draft.medicationsExclusions}
            onChange={(value) =>
              onChange({
                ...draft,
                medicationsExclusions: value,
              })
            }
          />
          <Input
            label="Study type"
            placeholder="Cardiology screening"
            value={draft.studyType}
            onChange={(value) =>
              onChange({ ...draft, studyType: value })
            }
          />
          <div className="tab-row">
            <Pill
              active={draft.recruitStatus === 'open'}
              onClick={() =>
                onChange({ ...draft, recruitStatus: 'open' })
              }
            >
              Open
            </Pill>
            <Pill
              active={draft.recruitStatus === 'closed'}
              onClick={() =>
                onChange({ ...draft, recruitStatus: 'closed' })
              }
            >
              Closed
            </Pill>
          </div>
          <Button
            disabled={busy}
            onClick={() => void onCreateStudy()}
          >
            {busy ? 'Publishing...' : 'Publish study'}
          </Button>
        </Card>
      </div>

      <div className="stack">
        {studies.map((study) => (
          <Card key={study.id}>
            <div className="card-topline">
              <div>
                <p className="eyebrow">{study.condition}</p>
                <h3>{study.title}</h3>
              </div>
              <Pill>{study.recruitStatus}</Pill>
            </div>
            <p>{study.locationLabel}</p>
            <p className="muted">
              Applicants:{' '}
              {
                totalApplicants.filter(
                  (application) => application.studyId === study.id
                ).length
              }
            </p>
            <div className="button-row">
              <Button
                variant="secondary"
                onClick={() => onOpenStudy(study.id)}
              >
                View study
              </Button>
              <Button
                onClick={() => onOpenApplicants(study.id)}
              >
                Open applicants
              </Button>
            </div>
          </Card>
        ))}

        {selectedStudy ? (
          <Card className="detail-card">
            <p className="eyebrow">Selected study</p>
            <h2>{selectedStudy.title}</h2>
            <div className="info-grid">
              <div>
                <span className="muted-label">Description</span>
                <p>{selectedStudy.description}</p>
              </div>
              <div>
                <span className="muted-label">Requirements</span>
                <p>{selectedStudy.requirements}</p>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function ApplicantsPanel({
  applications,
  busy,
  callDraft,
  likelyEligibleOnly,
  missingInfoOnly,
  notesDraft,
  onChangeCallDraft,
  onChangeNotes,
  onChangeRequestDraft,
  onOpenApplicant,
  onSaveNotes,
  onScheduleCall,
  onSendRequest,
  onToggleLikelyEligible,
  onToggleMissingInfo,
  onUpdateStatus,
  requestDraft,
  requests,
  searchTerm,
  selectedApplication,
  setSearchTerm,
  setStatusFilter,
  setStudyFilter,
  statusFilter,
  studies,
  studyFilter,
}: {
  applications: PatientApplication[];
  busy: boolean;
  callDraft: ScheduleCallDraft;
  likelyEligibleOnly: boolean;
  missingInfoOnly: boolean;
  notesDraft: string;
  onChangeCallDraft: (draft: ScheduleCallDraft) => void;
  onChangeNotes: (value: string) => void;
  onChangeRequestDraft: (
    draft: ClinicianRequestDraft
  ) => void;
  onOpenApplicant: (applicationId: string) => void;
  onSaveNotes: () => Promise<void>;
  onScheduleCall: () => Promise<void>;
  onSendRequest: () => Promise<void>;
  onToggleLikelyEligible: () => void;
  onToggleMissingInfo: () => void;
  onUpdateStatus: (
    status: ApplicationStatus
  ) => Promise<void>;
  requestDraft: ClinicianRequestDraft;
  requests: ScreeningRequest[];
  searchTerm: string;
  selectedApplication: PatientApplication | null;
  setSearchTerm: (value: string) => void;
  setStatusFilter: (
    value: 'all' | ApplicationStatus
  ) => void;
  setStudyFilter: (value: 'all' | string) => void;
  statusFilter: 'all' | ApplicationStatus;
  studies: StudyProgram[];
  studyFilter: 'all' | string;
}) {
  const statuses: Array<'all' | ApplicationStatus> = [
    'all',
    'submitted',
    'under_review',
    'info_requested',
    'eligible',
    'not_eligible',
    'scheduled_call',
  ];

  return (
    <div className="layout-grid">
      <div className="stack">
        <Card className="detail-card">
          <p className="eyebrow">Filters</p>
          <Input
            label="Search"
            placeholder="Search by name, email, location, or condition"
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <div className="tab-row">
            {statuses.map((status) => (
              <Pill
                key={status}
                active={statusFilter === status}
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' ? 'All' : prettyStatus(status)}
              </Pill>
            ))}
          </div>
          <div className="tab-row">
            <Pill
              active={studyFilter === 'all'}
              onClick={() => setStudyFilter('all')}
            >
              All studies
            </Pill>
            {studies.map((study) => (
              <Pill
                key={study.id}
                active={studyFilter === study.id}
                onClick={() => setStudyFilter(study.id)}
              >
                {study.title}
              </Pill>
            ))}
          </div>
          <div className="tab-row">
            <Pill
              active={missingInfoOnly}
              onClick={onToggleMissingInfo}
            >
              Missing info
            </Pill>
            <Pill
              active={likelyEligibleOnly}
              onClick={onToggleLikelyEligible}
            >
              Likely eligible
            </Pill>
          </div>
        </Card>

        {applications.length === 0 ? (
          <EmptyState
            title="No applicants match"
            body="Try clearing one of the filters to see more candidates."
          />
        ) : null}

        {applications.map((application) => (
          <Card key={application.id}>
            <div className="card-topline">
              <div>
                <p className="eyebrow">{application.email}</p>
                <h3>{application.fullName}</h3>
              </div>
              <Pill>{prettyStatus(application.status)}</Pill>
            </div>
            <p>
              {application.age} / {application.city}, {application.state}
            </p>
            <p>{application.condition}</p>
            <Button
              variant="secondary"
              onClick={() => onOpenApplicant(application.id)}
            >
              Review applicant
            </Button>
          </Card>
        ))}
      </div>

      <div className="stack">
        {selectedApplication ? (
          <Card className="detail-card">
            <p className="eyebrow">Applicant detail</p>
            <h2>{selectedApplication.fullName}</h2>
            <div className="info-grid">
              <div>
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
              <div>
                <span className="muted-label">Contact</span>
                <p>
                  {selectedApplication.email}
                  <br />
                  {selectedApplication.phone}
                </p>
              </div>
              <div>
                <span className="muted-label">Condition</span>
                <p>{selectedApplication.condition}</p>
              </div>
              <div>
                <span className="muted-label">Availability</span>
                <p>{selectedApplication.availability}</p>
              </div>
            </div>

            <div className="tab-row">
              {statuses
                .filter((status) => status !== 'all')
                .map((status) => (
                  <Pill
                    key={status}
                    active={selectedApplication.status === status}
                    onClick={() => void onUpdateStatus(status)}
                  >
                    {prettyStatus(status)}
                  </Pill>
                ))}
            </div>

            <TextArea
              label="Coordinator notes"
              placeholder="Private notes for the clinical team"
              value={notesDraft}
              onChange={onChangeNotes}
            />
            <Button
              disabled={busy}
              onClick={() => void onSaveNotes()}
            >
              {busy ? 'Saving...' : 'Save notes'}
            </Button>

            <TextArea
              label="Request title"
              placeholder="Confirm medication history"
              value={requestDraft.title}
              onChange={(value) =>
                onChangeRequestDraft({
                  ...requestDraft,
                  title: value,
                })
              }
            />
            <TextArea
              label="Request message"
              placeholder="What information do you need from the patient?"
              value={requestDraft.body}
              onChange={(value) =>
                onChangeRequestDraft({
                  ...requestDraft,
                  body: value,
                })
              }
            />
            <Input
              label="Deadline"
              placeholder="Due in 48 hours"
              value={requestDraft.dueLabel}
              onChange={(value) =>
                onChangeRequestDraft({
                  ...requestDraft,
                  dueLabel: value,
                })
              }
            />
            <Button
              disabled={busy}
              onClick={() => void onSendRequest()}
            >
              {busy ? 'Sending...' : 'Send request'}
            </Button>

            <Input
              label="Call time"
              placeholder="2026-03-31 10:30 AM EDT"
              value={callDraft.scheduledFor}
              onChange={(value) =>
                onChangeCallDraft({
                  ...callDraft,
                  scheduledFor: value,
                })
              }
            />
            <TextArea
              label="Call notes"
              placeholder="Why are you scheduling this call?"
              value={callDraft.note}
              onChange={(value) =>
                onChangeCallDraft({ ...callDraft, note: value })
              }
            />
            <Button
              disabled={busy}
              onClick={() => void onScheduleCall()}
            >
              {busy ? 'Scheduling...' : 'Schedule call'}
            </Button>

            <div className="timeline">
              {requests.length === 0 ? (
                <div className="timeline-item">
                  <span className="muted-label">Requests</span>
                  <p>No requests yet.</p>
                </div>
              ) : (
                requests.map((request) => (
                  <div
                    className="timeline-item"
                    key={request.id}
                  >
                    <span className="muted-label">
                      {request.title}
                    </span>
                    <p>{request.body}</p>
                    <p className="muted">
                      {request.status === 'responded'
                        ? `Patient replied: ${request.patientResponse}`
                        : request.dueLabel}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        ) : (
          <EmptyState
            title="Choose an applicant"
            body="Select a candidate on the left to review their screening details."
          />
        )}
      </div>
    </div>
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
