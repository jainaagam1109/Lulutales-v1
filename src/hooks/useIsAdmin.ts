import { useAuth } from "@/hooks/useAuth";

const ADMIN_EMAIL = "aagam_jain2022@pgp.isb.edu";

export const useIsAdmin = () =>
  useAuth().user?.email?.toLowerCase() === ADMIN_EMAIL;
