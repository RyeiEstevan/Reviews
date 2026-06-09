import { redirect } from "next/navigation";

export default function Home() {
  // The admin layout guards the session; unauthenticated users bounce to /login.
  redirect("/home");
}
