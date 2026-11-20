"""Private, transaction-bound enquiry change signals via Supabase Realtime."""
from alembic import op

revision = "0011_enquiry_broadcast"
down_revision = "0010_enquiry_read_tracking"
branch_labels = None
depends_on = None


def upgrade():
    if op.get_bind().dialect.name != "postgresql":
        return
    # Ordinary PostgreSQL installations keep the working polling fallback.
    op.execute("""
    DO $migration$
    BEGIN
      IF to_regprocedure('realtime.send(jsonb,text,text,boolean)') IS NULL THEN
        RAISE NOTICE 'Supabase Realtime unavailable; enquiry polling remains enabled';
        RETURN;
      END IF;
      CREATE FUNCTION public.flenzr_can_receive_enquiries(topic text) RETURNS boolean
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
        SELECT EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.supabase_uid = (SELECT auth.uid())::text
            AND u.is_active AND topic = 'enquiries:' || u.id
        );
      $fn$;
      REVOKE ALL ON FUNCTION public.flenzr_can_receive_enquiries(text) FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION public.flenzr_can_receive_enquiries(text) TO authenticated;
      CREATE POLICY flenzr_enquiry_receive ON realtime.messages FOR SELECT TO authenticated
        USING (extension = 'broadcast' AND public.flenzr_can_receive_enquiries((SELECT realtime.topic())));
      -- A restrictive guard prevents another permissive policy from granting access
      -- to someone else's Flenzr channel. Other applications' topics are unaffected.
      CREATE POLICY flenzr_enquiry_boundary ON realtime.messages AS RESTRICTIVE FOR SELECT TO authenticated
        USING ((SELECT realtime.topic()) NOT LIKE 'enquiries:%'
          OR public.flenzr_can_receive_enquiries((SELECT realtime.topic())));
      CREATE FUNCTION public.flenzr_broadcast_enquiry() RETURNS trigger
      LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
      DECLARE recipient text; creator_user text; notify_both boolean;
      BEGIN
        SELECT user_id INTO creator_user FROM public.creators WHERE id = NEW.creator_id;
        notify_both := TG_OP = 'INSERT';
        IF TG_OP = 'UPDATE' THEN
          notify_both := NEW.revision IS DISTINCT FROM OLD.revision;
        END IF;
        FOR recipient IN
          SELECT DISTINCT u.id FROM public.users u
          WHERE u.is_active AND (
            (u.id = NEW.sender_id AND (notify_both OR NEW.sender_read_revision IS DISTINCT FROM OLD.sender_read_revision))
            OR (u.id = creator_user AND (notify_both OR NEW.creator_read_revision IS DISTINCT FROM OLD.creator_read_revision))
          )
        LOOP
          -- Never broadcast full rows, contact data, budgets or read receipts.
          PERFORM realtime.send('{}'::jsonb, 'enquiries_changed', 'enquiries:' || recipient, true);
        END LOOP;
        RETURN NEW;
      END;
      $fn$;
      REVOKE ALL ON FUNCTION public.flenzr_broadcast_enquiry() FROM PUBLIC;
      CREATE TRIGGER flenzr_enquiry_changed AFTER INSERT OR UPDATE ON public.enquiries
        FOR EACH ROW EXECUTE FUNCTION public.flenzr_broadcast_enquiry();
    END;
    $migration$;
    """)


def downgrade():
    if op.get_bind().dialect.name != "postgresql":
        return
    op.execute("DROP TRIGGER IF EXISTS flenzr_enquiry_changed ON public.enquiries")
    op.execute("DROP FUNCTION IF EXISTS public.flenzr_broadcast_enquiry()")
    op.execute("""DO $$ BEGIN IF to_regclass('realtime.messages') IS NOT NULL THEN
      DROP POLICY IF EXISTS flenzr_enquiry_receive ON realtime.messages;
      DROP POLICY IF EXISTS flenzr_enquiry_boundary ON realtime.messages;
    END IF; END $$""")
    op.execute("DROP FUNCTION IF EXISTS public.flenzr_can_receive_enquiries(text)")
