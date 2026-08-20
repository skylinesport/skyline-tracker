'use client';

import ChecklistSection from '../ChecklistSection';

const intro = (
  <>
    Plan and run the campus ambassador program — recruitment, onboarding, tasks and rewards.
    Group items into phases and check them off as you go.
  </>
);

export default function CampusAmbassadorPage() {
  return (
    <ChecklistSection
      table="campus_tasks"
      channel="campus-realtime"
      title="Campus Ambassador"
      intro={intro}
      sqlFile="campus.sql"
      serviceLabel="Item"
    />
  );
}
