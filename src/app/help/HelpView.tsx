'use client';

import { useState, useMemo } from 'react';
import { HelpCircle, Search, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PageWrapper } from '@/components/layout';
import { SubpageHeader } from '@/components/layout';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { cn } from '@/lib/utils';

interface HelpSection {
  id: string;
  title: string;
  desktopOnly?: boolean;
  content: React.ReactNode;
}

function useSections(isMobile: boolean): HelpSection[] {
  return useMemo(() => {
    const all: HelpSection[] = [
      { id: 'getting-started', title: 'Getting Started', content: <GettingStarted /> },
      { id: 'roles', title: 'Roles & Permissions', content: <Roles /> },
      { id: 'dashboard', title: 'Dashboard', desktopOnly: true, content: <DashboardHelp /> },
      { id: 'mobile-dashboard', title: 'Mobile Dashboard', content: <MobileDashboardHelp /> },
      { id: 'calendar', title: 'Calendar', content: <CalendarHelp isMobile={isMobile} /> },
      { id: 'tasks', title: 'Tasks', content: <TasksHelp /> },
      { id: 'chores', title: 'Chores', content: <ChoresHelp /> },
      { id: 'goals', title: 'Goals & Points', content: <GoalsHelp /> },
      { id: 'shopping', title: 'Shopping', content: <ShoppingHelp /> },
      { id: 'meals', title: 'Meals', content: <MealsHelp /> },
      { id: 'messages', title: 'Messages', content: <MessagesHelp /> },
      { id: 'wishes', title: 'Wishes & Gift Ideas', content: <WishesHelp /> },
      { id: 'photos', title: 'Photos', desktopOnly: true, content: <PhotosHelp /> },
      { id: 'away-mode', title: 'Away Mode', desktopOnly: true, content: <AwayModeHelp /> },
      { id: 'babysitter', title: 'Babysitter Mode', desktopOnly: true, content: <BabysitterHelp /> },
      { id: 'screensaver', title: 'Screensaver', desktopOnly: true, content: <ScreensaverHelp /> },
      { id: 'settings', title: 'Settings', content: <SettingsHelp isMobile={isMobile} /> },
      { id: 'integrations', title: 'Integrations', content: <IntegrationsHelp /> },
      { id: 'pwa', title: 'Install as App', content: <PwaHelp /> },
      { id: 'shortcuts', title: 'Keyboard Shortcuts', desktopOnly: true, content: <ShortcutsHelp /> },
      { id: 'troubleshooting', title: 'Troubleshooting', content: <TroubleshootingHelp /> },
    ];
    return isMobile ? all.filter(s => !s.desktopOnly) : all;
  }, [isMobile]);
}

export function HelpView() {
  const isMobile = useIsMobile();
  const sections = useSections(isMobile);
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections.filter(s =>
      s.title.toLowerCase().includes(q)
    );
  }, [sections, search]);

  // Two-level nav: section list → section detail
  if (activeSection) {
    const section = sections.find(s => s.id === activeSection);
    if (!section) return null;
    return (
      <PageWrapper>
        <SubpageHeader
          icon={<HelpCircle className="h-5 w-5 text-primary" />}
          title={section.title}
          actions={
            <button
              onClick={() => setActiveSection(null)}
              className="text-sm text-primary hover:underline"
            >
              Back to Help
            </button>
          }
        />
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-3xl mx-auto prose prose-sm dark:prose-invert">
            {section.content}
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <SubpageHeader
        icon={<HelpCircle className="h-5 w-5 text-primary" />}
        title="Help"
      />
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search help topics..."
              className="pl-9"
            />
          </div>

          {/* Section list */}
          <div className="space-y-1">
            {filtered.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-border bg-card/85 hover:bg-accent transition-colors text-left"
              >
                <span className="font-medium text-sm">{section.title}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No matching topics</p>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

/* ================================================================
   SECTION CONTENT COMPONENTS
   ================================================================ */

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-lg font-bold mt-6 mb-2">{children}</h2>
);
const H3 = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-base font-semibold mt-4 mb-1">{children}</h3>
);
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-muted-foreground mb-2 leading-relaxed">{children}</p>
);
const Li = ({ children }: { children: React.ReactNode }) => (
  <li className="text-sm text-muted-foreground leading-relaxed">{children}</li>
);
const Ul = ({ children }: { children: React.ReactNode }) => (
  <ul className="list-disc pl-5 space-y-1 mb-3">{children}</ul>
);

function GettingStarted() {
  return (
    <>
      <P>Prism is a free, self-hosted family dashboard that brings together calendars, tasks, chores, shopping lists, meals, photos, and more into one shared hub.</P>
      <H2>First-Time Setup</H2>
      <Ul>
        <Li><strong>Add family members</strong> in Settings &gt; Family Members</Li>
        <Li><strong>Set PINs</strong> for each member in Settings &gt; Security</Li>
        <Li><strong>Connect integrations</strong> (Google Calendar, Microsoft To Do, weather)</Li>
        <Li><strong>Customize your dashboard</strong> layout using the Edit button</Li>
        <Li><strong>Install as an app</strong> on phones and tablets for quick access</Li>
      </Ul>
      <H2>Logging In</H2>
      <P>Tap a family member&apos;s avatar, then enter their 4-digit PIN. It auto-submits after 4 digits. Keyboard input (0-9, Backspace) also works.</P>
    </>
  );
}

function Roles() {
  return (
    <>
      <P>Prism has two roles: <strong>Parent</strong> and <strong>Child</strong>.</P>
      <H3>Parents can:</H3>
      <Ul>
        <Li>Manage settings, family members, and integrations</Li>
        <Li>Approve chore completions and redeem goals</Li>
        <Li>Edit dashboard layouts</Li>
        <Li>Exit Away Mode and Babysitter Mode</Li>
        <Li>Delete any message</Li>
      </Ul>
      <H3>Children can:</H3>
      <Ul>
        <Li>View the dashboard and all pages</Li>
        <Li>Mark chores complete (pending parent approval)</Li>
        <Li>Add tasks, messages, and wish list items</Li>
        <Li>Post and edit their own messages</Li>
      </Ul>
    </>
  );
}

function DashboardHelp() {
  return (
    <>
      <P>The dashboard displays live data through customizable widgets on a grid layout.</P>
      <H2>Available Widgets</H2>
      <P>Clock, Weather, Calendar, Tasks, Chores, Shopping, Meals, Messages, Photos, Points/Goals, Birthdays, Wishes, and Bus Tracker.</P>
      <H2>Editing the Layout</H2>
      <Ul>
        <Li>Tap the <strong>pencil icon</strong> in the header (parent only)</Li>
        <Li><strong>Drag</strong> widgets to reposition, <strong>resize</strong> by dragging corners</Li>
        <Li>Use the <strong>Widgets</strong> menu to show/hide widgets</Li>
        <Li>Adjust <strong>background color and opacity</strong> per widget</Li>
        <Li><strong>Save</strong>, <strong>Save As</strong>, or load <strong>Templates</strong></Li>
      </Ul>
      <H2>Multiple Dashboards</H2>
      <P>Create separate dashboards for different rooms (e.g., /d/kitchen, /d/living-room). Each has its own widget layout, screensaver, and orientation. Switch via the dropdown in the editor toolbar.</P>
    </>
  );
}

function MobileDashboardHelp() {
  return (
    <>
      <P>On phones, the dashboard shows a simplified single-column layout with summary cards for weather, calendar, chores, tasks, shopping, meals, messages, and birthdays.</P>
      <P>Tap any card to navigate to the full page for that feature.</P>
    </>
  );
}

function CalendarHelp({ isMobile }: { isMobile: boolean }) {
  return (
    <>
      <P>View and manage events from Google Calendar, Microsoft, and local calendars.</P>
      {!isMobile && (
        <>
          <H2>Views</H2>
          <P>Agenda, Day, Week, List, Multi-Week (1-4W), Month, and 3-Month. Switch views using the toolbar buttons.</P>
          <H2>Calendar Notes</H2>
          <P>Click the sticky note icon to show a notes panel alongside Day or List views. Notes are shared across the family and support formatting (Ctrl+B bold, Ctrl+I italic, Ctrl+U underline).</P>
          <H2>Hidden Hours</H2>
          <P>Hide a time range from day and week views (e.g., midnight to 6 AM). Configure in Settings &gt; Display &gt; Calendar Hours.</P>
        </>
      )}
      <H2>Navigation</H2>
      <P>Use Previous/Next arrows or swipe left/right on touch devices. Tap &quot;Today&quot; to jump back to the current date.</P>
    </>
  );
}

function TasksHelp() {
  return (
    <>
      <P>Create and manage to-do items with optional assignment, due dates, priorities, and categories.</P>
      <Ul>
        <Li><strong>Add</strong> via the &quot;Add Task&quot; button or inline text input</Li>
        <Li><strong>Complete</strong> by tapping the checkbox</Li>
        <Li><strong>Filter</strong> by person, priority, or category</Li>
        <Li><strong>Group by Person</strong> to see tasks organized by family member</Li>
        <Li><strong>Sync</strong> with Microsoft To Do (configure in Settings)</Li>
      </Ul>
    </>
  );
}

function ChoresHelp() {
  return (
    <>
      <P>Family chores with an approval workflow and point system.</P>
      <H2>How It Works</H2>
      <Ul>
        <Li>A parent creates a chore with a frequency and point value</Li>
        <Li>A child marks it complete — it enters &quot;Pending Approval&quot;</Li>
        <Li>A parent approves — points are awarded and the next due date advances</Li>
        <Li>If a parent completes it, it&apos;s auto-approved</Li>
      </Ul>
      <H2>Reset Day</H2>
      <P>Each chore can have a custom reset day. For weekly chores, choose which day of the week (Sun-Sat). Set this in the Add/Edit Chore modal.</P>
    </>
  );
}

function GoalsHelp() {
  return (
    <>
      <P>Set goals that children work toward by earning points from chore completions.</P>
      <H2>How Points Work</H2>
      <P>Points are earned from approved chores. The waterfall system allocates points in priority order — highest priority goals fill first, overflow goes to the next goal.</P>
      <H2>Recurring vs One-Time</H2>
      <Ul>
        <Li><strong>Recurring</strong> goals reset each period (weekly, monthly, yearly)</Li>
        <Li><strong>One-time</strong> goals accumulate until a parent redeems them</Li>
      </Ul>
      <H2>Celebrations</H2>
      <P>When a goal is fully achieved, a seasonal celebration animation plays — themed to the nearest holiday (St. Patrick&apos;s, Easter, July 4th, Halloween, Thanksgiving, Christmas, etc.).</P>
    </>
  );
}

function ShoppingHelp() {
  return (
    <>
      <P>Manage multiple shopping lists with categories and per-person tracking.</P>
      <Ul>
        <Li><strong>Multiple lists</strong> — Groceries, Hardware, General, etc.</Li>
        <Li><strong>Categories</strong> — Produce, Dairy, Bakery, Meat, etc.</Li>
        <Li><strong>Group by person</strong> — See who requested each item</Li>
        <Li><strong>Reorder</strong> — Drag items to arrange by store layout</Li>
        <Li><strong>Sync</strong> with Microsoft To Do (configure in Settings)</Li>
      </Ul>
    </>
  );
}

function MealsHelp() {
  return (
    <>
      <P>Weekly meal planner with recipe integration.</P>
      <Ul>
        <Li><strong>Plan meals</strong> by assigning recipes to days</Li>
        <Li><strong>Multiple meal types</strong> — Breakfast, Lunch, Dinner, Snack</Li>
        <Li><strong>Link recipes</strong> from your recipe library</Li>
        <Li><strong>Mark as cooked</strong> to track what&apos;s been prepared</Li>
      </Ul>
    </>
  );
}

function MessagesHelp() {
  return (
    <>
      <P>Family message board for shared updates.</P>
      <Ul>
        <Li><strong>Post</strong> messages attributed to whoever is logged in</Li>
        <Li><strong>Pin</strong> important messages to the top</Li>
        <Li><strong>Set expiration</strong> for temporary notices (12h to 7 days)</Li>
        <Li><strong>Edit</strong> — Click the pencil icon, Ctrl+Enter to save</Li>
        <Li><strong>Delete</strong> — Authors can delete their own; parents can delete any</Li>
      </Ul>
    </>
  );
}

function WishesHelp() {
  return (
    <>
      <H2>Wish Lists</H2>
      <P>Each family member has their own wish list. Others can secretly mark items as purchased — the owner doesn&apos;t see who bought what.</P>
      <Ul>
        <Li><strong>Add</strong> items with name, link, and notes</Li>
        <Li><strong>Claim</strong> — Mark as purchased (secret from the owner)</Li>
        <Li><strong>Cross off</strong> — Owner can cross off items they got themselves</Li>
        <Li><strong>Sync</strong> with Microsoft To Do per member (Settings)</Li>
      </Ul>
      <H2>Gift Ideas</H2>
      <P>Private per-user gift idea tracking. Switch to the &quot;Gift Ideas&quot; tab on the Wishes page.</P>
      <Ul>
        <Li>See columns for each family member (except yourself)</Li>
        <Li>Add ideas with name, link, price, and notes</Li>
        <Li>Mark as purchased when you buy them</Li>
        <Li><strong>Privacy</strong>: Only you can see your ideas — they are never visible to the recipient or other family members</Li>
      </Ul>
    </>
  );
}

function PhotosHelp() {
  return (
    <>
      <P>Photo gallery with local uploads and OneDrive sync.</P>
      <Ul>
        <Li><strong>Gallery</strong> — Browse all photos with lightbox view</Li>
        <Li><strong>Slideshow</strong> — Auto-rotating display for screensaver and away mode</Li>
        <Li><strong>Sources</strong> — Local uploads or OneDrive sync</Li>
        <Li><strong>Pin photo</strong> — Set as wallpaper or screensaver background</Li>
      </Ul>
      <P>Configure in Settings &gt; Photos.</P>
    </>
  );
}

function AwayModeHelp() {
  return (
    <>
      <P>Privacy overlay for when the dashboard is unattended. Shows a photo slideshow with clock and weather.</P>
      <Ul>
        <Li><strong>Activate</strong>: Tap the shield icon in the dashboard header</Li>
        <Li><strong>Auto-activate</strong>: Configure timer in Settings &gt; Display</Li>
        <Li><strong>Exit</strong>: Tap anywhere, then enter a parent PIN</Li>
      </Ul>
    </>
  );
}

function BabysitterHelp() {
  return (
    <>
      <P>Caregiver information overlay showing emergency contacts, house info, child details, and house rules.</P>
      <Ul>
        <Li><strong>Activate</strong>: Tap the babysitter icon in the dashboard header</Li>
        <Li><strong>Exit</strong>: Tap anywhere, then enter a parent PIN</Li>
        <Li><strong>Configure</strong>: Settings &gt; Babysitter Info</Li>
        <Li>Also available at <strong>/babysitter</strong> without login</Li>
      </Ul>
    </>
  );
}

function ScreensaverHelp() {
  return (
    <>
      <P>Auto-activates when the device is idle. Shows a photo slideshow with optional widgets.</P>
      <Ul>
        <Li><strong>Configure timeout</strong>: Settings &gt; Display &gt; Screensaver Interval</Li>
        <Li><strong>Photo rotation</strong>: Set interval or pin one static photo</Li>
        <Li><strong>Edit layout</strong>: In dashboard edit mode, toggle &quot;Screensaver&quot;</Li>
      </Ul>
    </>
  );
}

function SettingsHelp({ isMobile }: { isMobile: boolean }) {
  return (
    <>
      <P>Configure Prism to fit your family&apos;s needs.</P>
      <H3>Family Members</H3>
      <P>Add, edit, or remove members. Set names, colors, avatars, and roles.</P>
      <H3>Security</H3>
      <P>Set or change PINs. Generate API tokens for external integrations.</P>
      <H3>Connected Accounts</H3>
      <P>Connect Google (Calendar) and Microsoft (To Do, OneDrive) accounts.</P>
      <H3>Display</H3>
      <Ul>
        <Li><strong>Theme</strong> — Light, Dark, or System</Li>
        <Li><strong>Week Starts On</strong> — Sunday or Monday</Li>
        {!isMobile && <Li><strong>Calendar Hours</strong> — Hide time ranges from day/week views</Li>}
        {!isMobile && <Li><strong>Auto-Hide Navigation</strong> — Hide nav after inactivity</Li>}
        {!isMobile && <Li><strong>Away Mode Timer</strong> — Auto-activate after idle period</Li>}
      </Ul>
      <H3>Backups</H3>
      <P>Create, download, and restore database backups.</P>
    </>
  );
}

function IntegrationsHelp() {
  return (
    <>
      <H2>Google Calendar</H2>
      <P>Connect in Settings &gt; Connected Accounts. Read-only sync — events appear in Prism but changes don&apos;t sync back to Google.</P>
      <H2>Microsoft To Do</H2>
      <P>Bidirectional sync for Tasks, Shopping Lists, and Wish Lists. Configure each in its own Settings section. Uses newest-wins conflict resolution.</P>
      <H2>OneDrive Photos</H2>
      <P>Sync photos from OneDrive folders. Configure in Settings &gt; Photos.</P>
      <H2>Weather</H2>
      <P>Requires an OpenWeatherMap API key. Set your location in Settings &gt; Display.</P>
    </>
  );
}

function PwaHelp() {
  return (
    <>
      <P>Install Prism as an app on your device for quick access without opening a browser.</P>
      <H3>iOS (Safari)</H3>
      <P>Open Prism in Safari &gt; tap <strong>Share</strong> &gt; <strong>Add to Home Screen</strong> &gt; <strong>Add</strong>.</P>
      <H3>Android (Chrome)</H3>
      <P>Open in Chrome &gt; tap <strong>Menu</strong> &gt; <strong>Install app</strong>.</P>
      <H3>Desktop (Chrome/Edge)</H3>
      <P>Click the <strong>install icon</strong> in the address bar.</P>
    </>
  );
}

function ShortcutsHelp() {
  return (
    <>
      <div className="space-y-2">
        {[
          ['0-9', 'PIN pad', 'Enter digit'],
          ['Backspace', 'PIN pad', 'Delete last digit'],
          ['Escape', 'Modals', 'Close'],
          ['Ctrl+Enter', 'Message edit', 'Save'],
          ['Ctrl+B', 'Calendar notes', 'Bold'],
          ['Ctrl+I', 'Calendar notes', 'Italic'],
          ['Ctrl+U', 'Calendar notes', 'Underline'],
          ['Ctrl+Shift+S', 'Calendar notes', 'Strikethrough'],
          ['Ctrl+Shift+L', 'Calendar notes', 'Bullet list'],
          ['Ctrl+Shift+M', 'Layout editor', 'Toggle measure mode'],
        ].map(([key, where, action]) => (
          <div key={key} className="flex items-center gap-3 text-sm">
            <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-xs font-mono shrink-0 min-w-[100px] text-center">{key}</kbd>
            <span className="text-muted-foreground shrink-0 w-28">{where}</span>
            <span>{action}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function TroubleshootingHelp() {
  return (
    <>
      <H3>Forgot PIN</H3>
      <P>Ask a parent to reset it in Settings &gt; Security &gt; Member PINs.</P>
      <H3>Calendar events not showing</H3>
      <P>Check Settings &gt; Calendars — is the calendar enabled? Tap &quot;Sync&quot; to force a refresh. Verify the Google/Microsoft connection is active.</P>
      <H3>Tasks/Shopping not syncing</H3>
      <P>Verify Microsoft is connected in Settings &gt; Connected Accounts. Check the sync source is enabled. Tap &quot;Sync All&quot; to force a refresh.</P>
      <H3>Widget not loading</H3>
      <P>Refresh the page. Toggle the widget off and on in edit mode. Clear browser cache if stuck.</P>
    </>
  );
}
