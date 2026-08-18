# Review package: 0121c19..HEAD

## Commits
1f059d2 Align public navigation landmarks

## Files changed
 src/App.jsx      | 16 +++++++++-------
 src/App.test.jsx | 32 ++++++++++++++++++++++++++++++++
 2 files changed, 41 insertions(+), 7 deletions(-)

## Diff
diff --git a/src/App.jsx b/src/App.jsx
index 0a5ced0..f5562bc 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -10,47 +10,49 @@ import AdminPanel from './components/AdminPanel.jsx';
 import Leaderboard from './components/Leaderboard.jsx';
 import MetricCard from './components/MetricCard.jsx';
 import SubmissionPanel from './components/SubmissionPanel.jsx';
 import SubmissionStatus from './components/SubmissionStatus.jsx';
 import { challenge } from './data/challengeData';
 
 export default function App() {
   const route = getRoute();
 
   return (
-    <main>
+    <>
       <SiteNav />
-      {route.type === 'admin' && <AdminPanel />}
-      {route.type === 'submission' && <SubmissionStatus id={route.id} token={route.token} />}
-      {route.type === 'home' && <HomePage />}
-    </main>
+      <main>
+        {route.type === 'admin' && <AdminPanel />}
+        {route.type === 'submission' && <SubmissionStatus id={route.id} token={route.token} />}
+        {route.type === 'home' && <HomePage />}
+      </main>
+    </>
   );
 }
 
 function HomePage() {
   return (
     <>
       <section className="hero" id="home">
         <div className="hero-copy">
           <p className="eyebrow">Agricultural robotics benchmark</p>
           <h1>SLAM on long-term vineyard traverses</h1>
           <p>
             Train on public BLT runs, run your LiDAR or vision SLAM method locally, then upload a TUM text
             trajectory for one difficult summer test run. A Raspberry Pi evaluator runs evo against private
             ground truth and publishes reviewed leaderboard entries.
           </p>
           <div className="hero-actions">
             <a className="primary-action" href={challenge.datasetUrl} target="_blank" rel="noreferrer">
               Get dataset access
               <ArrowRight size={18} />
             </a>
-            <a className="secondary-action" href="#submit">
+            <a className="secondary-action" href="/#submit">
               Submit odometry
             </a>
           </div>
         </div>
 
         <div className="hero-panel" aria-label="Challenge summary">
           <div className="photo-card">
             <span>Summer test run</span>
             <strong>Live hidden-ground-truth evaluation</strong>
           </div>
@@ -134,21 +136,21 @@ function HomePage() {
           .
         </p>
       </footer>
     </>
   );
 }
 
 function SiteNav() {
   return (
     <nav className="site-nav" aria-label="Main navigation">
-      <a className="brand" href="/">
+      <a className="brand" href="/#home">
         <span>BLT</span>
         SLAM Challenge
       </a>
       <div>
         <a href="/#dataset">Dataset & Rules</a>
         <a href="/#submit">Submit</a>
         <a href="/#leaderboards">Leaderboards</a>
         <a href="/admin">Admin</a>
       </div>
     </nav>
diff --git a/src/App.test.jsx b/src/App.test.jsx
new file mode 100644
index 0000000..e390492
--- /dev/null
+++ b/src/App.test.jsx
@@ -0,0 +1,32 @@
+import { cleanup, render, screen, within } from '@testing-library/react';
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
+import App from './App';
+import { fetchLeaderboards } from './lib/api';
+
+vi.mock('./lib/api', () => ({ fetchLeaderboards: vi.fn() }));
+
+describe('App', () => {
+  afterEach(cleanup);
+
+  beforeEach(() => {
+    fetchLeaderboards.mockReset();
+    fetchLeaderboards.mockResolvedValue({ lidar: [], vision: [], combined: [] });
+  });
+
+  it('keeps main navigation destinations and one full leaderboard landmark', async () => {
+    render(<App />);
+
+    const navigation = within(screen.getByRole('navigation', { name: 'Main navigation' }));
+    expect(navigation.getByRole('link', { name: 'Dataset & Rules' })).toHaveAttribute('href', '/#dataset');
+    expect(navigation.getByRole('link', { name: 'Submit' })).toHaveAttribute('href', '/#submit');
+    expect(navigation.getByRole('link', { name: 'Leaderboards' })).toHaveAttribute('href', '/#leaderboards');
+    expect(document.querySelector('#dataset')).toBeInTheDocument();
+    expect(document.querySelector('#submit')).toBeInTheDocument();
+    expect(document.querySelectorAll('#leaderboards')).toHaveLength(1);
+    expect(document.querySelector('#leaderboard-preview')).toBeInTheDocument();
+    expect(await screen.findByRole('link', { name: /view full leaderboards/i })).toHaveAttribute(
+      'href',
+      '/#leaderboards',
+    );
+  });
+});
