// The logged-in user's profile (Depop handle, latest upload, plan), shared by the header and pages.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getProfile, type Profile } from "./api";

type ProfileState = {
  profile: Profile | null;
  setProfile: (profile: Profile) => void;
  refreshProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileState>({
  profile: null,
  setProfile: () => {},
  refreshProfile: async () => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);

  async function refreshProfile() {
    setProfile(await getProfile().catch(() => ({ plan: { member: false, freeReportsLeft: 0, reportsLeftToday: 0, price: "" } })));
  }

  useEffect(() => {
    refreshProfile();
  }, []);

  return <ProfileContext.Provider value={{ profile, setProfile, refreshProfile }}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  return useContext(ProfileContext);
}
