import type { DeliveryWorkspace } from "@/lib/deliveries";

export function RevisionAllowance({ value }: { value: DeliveryWorkspace["revision_allowance"] }) {
  if (!value) return null;
  return <div className="fl-revision-allowance" aria-label="Revision allowance"><h3>Revision rounds</h3>
    {value.limit === null ? <p>No structured revision limit agreed. {value.used} {value.used === 1 ? "round requested" : "rounds requested"}. Written scope still applies.</p> : <>
      <p>{value.used} of {value.limit} used · {value.remaining} remaining</p>
      {value.remaining === 0 && <p>The agreed allowance is used. Further revision requests are closed; approval remains available. Discuss any additional scope with your collaborator. This does not automatically approve the work or create a charge.</p>}
    </>}
    <p>Each saved request for revisions counts as one round across the collaboration. Submissions and approval do not use a round.</p>
  </div>;
}
