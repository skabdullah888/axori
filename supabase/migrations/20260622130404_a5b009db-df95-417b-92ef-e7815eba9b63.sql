CREATE OR REPLACE FUNCTION public.prevent_publisher_task_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins can modify anything
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Only the publisher can reach this trigger via the RLS policy; restrict which fields they may change
  IF NEW.publisher_id IS DISTINCT FROM OLD.publisher_id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.completed_slots IS DISTINCT FROM OLD.completed_slots
     OR NEW.total_slots IS DISTINCT FROM OLD.total_slots
     OR NEW.reward IS DISTINCT FROM OLD.reward
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Publishers are not allowed to modify privileged task fields (status, slots, reward, publisher_id)';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_publisher_task_privilege_escalation ON public.tasks;
CREATE TRIGGER prevent_publisher_task_privilege_escalation
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.prevent_publisher_task_privilege_escalation();