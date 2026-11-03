// The logged-in user's profile (Depop handle, latest upload), shared by the header and pages.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getProfile, type Profile } from "./api";

type ProfileState = { profile: Profile | null; setProfile: (profile: Profile) => void };

const ProfileContext = createContext<ProfileState>({ profile: null, setProfile: () => {} });

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch(() => setProfile({}));
  }, []);

  return <ProfileContext.Provider value={{ profile, setProfile }}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  return useContext(ProfileContext);
}
