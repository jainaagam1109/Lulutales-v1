import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { LuluLogo } from "@/components/LuluLogo";

type Section = { h: string; body: (string | string[])[] };

const UPDATED = "12 October 2026";

const PRIVACY: Section[] = [
  {
    h: "Who we are",
    body: [
      "LuluTales (“we”, “us”) makes personalised audio and read-aloud stories for children aged 2 to 9, at lulutales.in. This policy explains what we collect, why, and the choices you have. It is written for parents and guardians.",
      "If you have any question about your data, write to us at hello@lulutales.in.",
    ],
  },
  {
    h: "The short version",
    body: [
      [
        "An adult (a parent or guardian) creates the account. Children do not sign up themselves.",
        "We use your child’s details only to write their stories and show stories that suit them.",
        "We never sell your data, never show ads, and never use your child’s details for advertising.",
        "You can ask us to correct or delete your data at any time.",
      ],
    ],
  },
  {
    h: "What we collect",
    body: [
      "About you: your email address, and your name if you sign in with Google.",
      "About your child, when you add them: first name, age, and optionally girl/boy. When you make a story, we also ask for details that make it feel like home, such as what your child calls family members, your city, and, if you choose to share them, a favourite toy or place.",
      "Your choices in the app: the moments and themes you pick, story format and language, and your settings (sleep timer, autoplay, look).",
      "How stories are used: which stories are played or read, how far, and when. This lets us resume a story where you left off and show you what your child is learning.",
      "Anything you send us: reports about a story, and emails to hello@lulutales.in.",
      "Basic technical data: device and browser type and similar information our hosting providers record to keep the service secure and working.",
    ],
  },
  {
    h: "How we use it",
    body: [
      [
        "To write, check and record your child’s personalised stories.",
        "To run your account: sign-in, your story library, saved stories, listening progress and settings.",
        "To manage access: the waitlist, approvals, invites and monthly story allowance.",
        "To send you service emails: sign-in codes, a thank-you when you register, and a note when your family is approved. We do not send marketing emails without your consent.",
        "To keep LuluTales safe and improve it: fixing problems, reviewing reports, and understanding which stories families find useful.",
      ],
    ],
  },
  {
    h: "Your child’s information",
    body: [
      "By creating an account and adding a child, you confirm you are their parent or lawful guardian and that you consent to us using their details as described here.",
      "We do not track children for advertising, do not build advertising profiles, and do not show ads. Your child’s details are used only to make and personalise their stories.",
      "Stories made for your child are private to your family’s account.",
    ],
  },
  {
    h: "Who helps us run LuluTales",
    body: [
      "We use trusted service providers who process data only on our instructions and only to provide their service:",
      [
        "Supabase: our database, sign-in and story audio storage.",
        "Lovable: hosting of the website and app.",
        "Anthropic: AI that writes and checks stories, using the story details you provide.",
        "ElevenLabs and Sarvam: voices that record the stories.",
        "Resend: sending our emails. Zoho: our hello@lulutales.in mailbox.",
        "Google: if you choose “Continue with Google”.",
      ],
      "Some of these providers may store or process data outside India. We choose providers with strong security and privacy commitments.",
      "We may share information if the law requires it, or to protect the safety of children or others.",
    ],
  },
  {
    h: "How long we keep it",
    body: [
      "We keep your account and your child’s stories for as long as your account is open, so your library is there when you return. If you ask us to delete your account, we delete your family’s data within 30 days, except where the law requires us to keep something for longer.",
    ],
  },
  {
    h: "Your rights",
    body: [
      "You can ask us to: see the personal data we hold about you and your child; correct anything that is wrong; delete your account and your family’s data; or withdraw your consent (which means we can no longer make personalised stories for you).",
      "Write to hello@lulutales.in from the email address on your account. We will reply within 7 working days. Many details can also be changed directly in the app, under Parents.",
    ],
  },
  {
    h: "Security",
    body: [
      "We use encryption in transit, access controls so each family can see only its own data, and limited staff access. No service is perfectly secure, so please keep access to your email account safe, since that is how you sign in.",
    ],
  },
  {
    h: "Grievances",
    body: [
      "If you have a concern about how we handle your data, contact our Grievance Officer at hello@lulutales.in. We will acknowledge it within 48 hours and aim to resolve it within 30 days. If you are not satisfied, you may approach the Data Protection Board of India.",
    ],
  },
  {
    h: "Changes to this policy",
    body: [
      "If we make important changes, we will tell you by email or in the app before they take effect. The date at the top shows when this policy was last updated.",
    ],
  },
];

const TERMS: Section[] = [
  {
    h: "About these terms",
    body: [
      "These terms are an agreement between you and LuluTales (“we”, “us”) for using lulutales.in and the LuluTales app. By creating an account, you agree to them. Please also read our Privacy Policy.",
    ],
  },
  {
    h: "Who can use LuluTales",
    body: [
      "Accounts are for adults: you must be 18 or older and the parent or lawful guardian of any child you add. Children can listen to and read stories with you, but should not create accounts.",
      "You are responsible for your account and for keeping access to your email or Google account secure.",
    ],
  },
  {
    h: "Founding families, access and allowances",
    body: [
      [
        "We are opening personalised stories to families in stages. New sign-ups may join a short waitlist before personalised stories open for them. The story library is available while you wait.",
        "Founding families can use LuluTales free of charge until 31 December 2026.",
        "Each family can make a set number of personalised stories each calendar month (currently 5), shared across all children on the account. Inviting friends can add bonus stories, as shown in the app.",
        "A story that we cannot make does not count towards your allowance.",
        "Before any paid plan begins, we will tell you clearly and in advance. Nothing will be charged unless you choose a plan.",
      ],
    ],
  },
  {
    h: "About our stories",
    body: [
      "Stories are written with the help of AI, using the details you provide, and are designed with certified child psychologists. Every personalised story passes our quality and safety checks before it reaches you, but no system is perfect.",
      "Please listen with or near your child, especially the first time. If anything feels wrong for your child, use “Report” in the player or write to hello@lulutales.in and we will look at it promptly.",
      "LuluTales is for enjoyment and gentle learning. It is not medical, psychological or educational advice, and is not a substitute for professional help.",
    ],
  },
  {
    h: "Using LuluTales fairly",
    body: [
      "Please do not: enter details about a child who is not in your care; enter offensive or unlawful content in story requests; try to access other families’ accounts or data; copy, resell or publicly distribute our stories; or interfere with how the service works.",
      "We may limit, suspend or close accounts that break these rules or put children or others at risk.",
    ],
  },
  {
    h: "Ownership",
    body: [
      "LuluTales, our app, our library stories, voices, illustrations and design belong to us or our licensors. Stories made for your family are for your family’s personal, non-commercial use. You may play them at home and share them privately with family; please do not publish or sell them.",
    ],
  },
  {
    h: "Availability and changes",
    body: [
      "We work hard to keep LuluTales running smoothly, but we cannot promise it will always be available or free of errors. We may change, add or remove features. If we make important changes to these terms, we will tell you in advance by email or in the app.",
    ],
  },
  {
    h: "Ending your account",
    body: [
      "You can stop using LuluTales at any time and ask us to delete your account by writing to hello@lulutales.in. We may close accounts as described above, and will tell you why where we can.",
    ],
  },
  {
    h: "Responsibility",
    body: [
      "To the extent the law allows, LuluTales is provided “as is”, and we are not liable for indirect or consequential losses. Nothing in these terms limits rights you have under Indian consumer law that cannot be excluded.",
    ],
  },
  {
    h: "Law and disputes",
    body: [
      "These terms are governed by the laws of India. Courts in Bengaluru, Karnataka will have jurisdiction, subject to any rights you have under consumer protection law.",
    ],
  },
  {
    h: "Contact",
    body: ["Questions about these terms? Write to hello@lulutales.in."],
  },
];

const Legal = ({ kind }: { kind: "privacy" | "terms" }) => {
  const title = kind === "privacy" ? "Privacy Policy" : "Terms of Use";
  const sections = kind === "privacy" ? PRIVACY : TERMS;
  useEffect(() => {
    document.title = `${title} · LuluTales`;
    window.scrollTo(0, 0);
  }, [title]);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="mx-auto max-w-[720px] px-5 pb-16 pt-6 md:pt-10">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" aria-label="LuluTales home">
            <LuluLogo size={30} />
          </Link>
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = "/"))}
            className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
        </div>
        <h1 className="font-[Quicksand] text-[32px] font-bold leading-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Last updated {UPDATED}</p>

        <div className="mt-8 flex flex-col gap-8">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="font-[Quicksand] text-[20px] font-bold">{s.h}</h2>
              {s.body.map((b, i) =>
                Array.isArray(b) ? (
                  <ul key={i} className="mt-2 list-disc space-y-1.5 pl-5 text-[16px] leading-relaxed text-foreground/85">
                    {b.map((li) => (
                      <li key={li}>{li}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={i} className="mt-2 text-[16px] leading-relaxed !text-foreground/85">
                    {b}
                  </p>
                )
              )}
            </section>
          ))}
        </div>

        <p className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
          See also:{" "}
          {kind === "privacy" ? (
            <Link to="/terms" className="font-semibold text-primary">Terms of Use</Link>
          ) : (
            <Link to="/privacy" className="font-semibold text-primary">Privacy Policy</Link>
          )}
          {" · "}Contact: <a href="mailto:hello@lulutales.in" className="font-semibold text-primary">hello@lulutales.in</a>
        </p>
      </div>
    </div>
  );
};

export default Legal;
