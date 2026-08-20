'use client';

import ChecklistSection from '../ChecklistSection';

const intro = (
  <>
    Move every service off a personal email onto a <b>company-owned identity</b>, so no single
    person (or lost inbox) is a single point of failure. Work top-down — later phases depend on
    the company email + password manager from Phase&nbsp;0.
  </>
);

export default function MigrationPage() {
  return (
    <ChecklistSection
      table="migration_tasks"
      channel="migration-realtime"
      title="Account migration"
      intro={intro}
      sqlFile="migration.sql"
      serviceLabel="Service"
    />
  );
}
