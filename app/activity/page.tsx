"use client";

import PageHeader from "@/components/PageHeader";
import ActivityList from "@/components/ActivityList";

export default function ActivityPage() {
  return (
    <>
      <PageHeader
        title="Activity"
        description="Administrators see everyone's activity. Everyone else sees their own."
      />
      <section className="card">
        <ActivityList />
      </section>
    </>
  );
}