# Review package: b4c0ff5..HEAD

## Commits
1e3ee92 feat: improve leaderboard accessibility and mobile view

## Files changed
 src/components/Leaderboard.jsx      | 106 +++++++++++++++++++++++-------------
 src/components/Leaderboard.test.jsx |  73 +++++++++++++++++++++++++
 src/styles.css                      |  24 ++++++++
 3 files changed, 166 insertions(+), 37 deletions(-)

## Diff
diff --git a/src/components/Leaderboard.jsx b/src/components/Leaderboard.jsx
index 2166ec4..94e9caa 100644
--- a/src/components/Leaderboard.jsx
+++ b/src/components/Leaderboard.jsx
@@ -1,19 +1,19 @@
 import { useEffect, useMemo, useState } from 'react';
 import { categories } from '../data/challengeData';
 import { fetchLeaderboards } from '../lib/api';
 import { categoryLabel, formatRmse } from '../lib/format';
 
 const tabs = categories;
 
 export default function Leaderboard({ compact = false }) {
-  const [active, setActive] = useState('combined');
+  const [active, setActive] = useState('lidar');
   const [leaderboards, setLeaderboards] = useState({ lidar: [], vision: [], combined: [] });
   const [status, setStatus] = useState('loading');
 
   useEffect(() => {
     let ignore = false;
     fetchLeaderboards()
       .then((payload) => {
         if (!ignore) {
           setLeaderboards(payload);
           setStatus('ready');
@@ -23,73 +23,105 @@ export default function Leaderboard({ compact = false }) {
         if (!ignore) setStatus('error');
       });
     return () => {
       ignore = true;
     };
   }, []);
 
   const rows = useMemo(() => leaderboards[active] ?? [], [active, leaderboards]);
 
   const visibleRows = compact ? rows.slice(0, 4) : rows;
+  const activeTab = tabs.find((tab) => tab.id === active);
+  const activePanelId = `leaderboard-panel-${active}`;
 
   return (
     <section className={compact ? 'leaderboard compact-panel' : 'leaderboard page-panel'} id="leaderboards">
       <div className="section-heading">
         <p className="eyebrow">Public dashboard</p>
         <h2>{compact ? 'Current benchmark snapshot' : 'Leaderboards'}</h2>
-        <p>
-          Official category rankings use lower ATE RMSE. The Combined view is exploratory because LiDAR and
-          Vision use different alignment policies.
-        </p>
+        {!compact && (
+          <p>
+            Official category rankings use lower ATE RMSE. The Combined view is exploratory because LiDAR and
+            Vision use different alignment policies.
+          </p>
+        )}
       </div>
 
       <div className="tab-list" role="tablist" aria-label="Leaderboard category">
         {tabs.map((tab) => (
           <button
             className={active === tab.id ? 'tab active' : 'tab'}
             type="button"
             key={tab.id}
+            id={`leaderboard-tab-${tab.id}`}
+            role="tab"
+            aria-selected={active === tab.id}
+            aria-controls={`leaderboard-panel-${tab.id}`}
             onClick={() => setActive(tab.id)}
           >
             {tab.label}
           </button>
         ))}
       </div>
 
-      {status === 'loading' && <p className="panel-note">Loading live leaderboard...</p>}
-      {status === 'error' && <p className="panel-note">Leaderboard API is not available yet.</p>}
-      {status === 'ready' && visibleRows.length === 0 && <p className="panel-note">No published results yet.</p>}
+      <div
+        id={activePanelId}
+        role="tabpanel"
+        aria-label={`${activeTab.label} leaderboard`}
+      >
+        {status === 'loading' && <p className="panel-note" role="status">Loading live leaderboard...</p>}
+        {status === 'error' && (
+          <p className="panel-note" role="status">Leaderboard is unavailable. Please try again later.</p>
+        )}
+        {status === 'ready' && visibleRows.length === 0 && <p className="panel-note">No published results yet.</p>}
 
-      <div className="table-wrap">
-        <table>
-          <thead>
-            <tr>
-              <th>Rank</th>
-              <th>Team / method</th>
-              <th>Category</th>
-              <th>ATE RMSE</th>
-              <th>RPE</th>
-              <th>Alignment</th>
-              <th>Attempt</th>
-            </tr>
-          </thead>
-          <tbody>
-            {visibleRows.map((entry) => (
-              <tr key={entry.submission_id}>
-                <td>#{entry.rank}</td>
-                <td>
-                  <strong>{entry.team}</strong>
-                  <span>{entry.method}</span>
-                </td>
-                <td>{categoryLabel(entry.category)}</td>
-                <td>{formatRmse(entry.ate_rmse)}</td>
-                <td>{formatRmse(entry.rpe_rmse)}</td>
-                <td>{entry.alignment?.toUpperCase()}</td>
-                <td>#{entry.attempt_number}</td>
+        <div className="table-wrap">
+          <table>
+            <thead>
+              <tr>
+                <th>Rank</th>
+                <th>Team / method</th>
+                <th>Category</th>
+                <th>ATE RMSE</th>
+                <th>RPE</th>
+                <th>Alignment</th>
+                <th>Attempt</th>
               </tr>
-            ))}
-          </tbody>
-        </table>
+            </thead>
+            <tbody>
+              {visibleRows.map((entry) => (
+                <tr key={entry.submission_id}>
+                  <td>#{entry.rank}</td>
+                  <td>
+                    <strong>{entry.team}</strong>
+                    <span>{entry.method}</span>
+                  </td>
+                  <td>{categoryLabel(entry.category)}</td>
+                  <td>{formatRmse(entry.ate_rmse)}</td>
+                  <td>{formatRmse(entry.rpe_rmse)}</td>
+                  <td>{entry.alignment?.toUpperCase()}</td>
+                  <td>#{entry.attempt_number}</td>
+                </tr>
+              ))}
+            </tbody>
+          </table>
+        </div>
+
+        <div className="leaderboard-cards">
+          {visibleRows.map((entry) => (
+            <article className="leaderboard-card" data-testid={`leaderboard-card-${entry.submission_id}`} key={entry.submission_id}>
+              <div className="leaderboard-card-heading">
+                <strong>#{entry.rank}</strong>
+                <span>{categoryLabel(entry.category)}</span>
+              </div>
+              <strong>{entry.team}</strong>
+              <span>{entry.method}</span>
+              <span>ATE RMSE: {formatRmse(entry.ate_rmse)}</span>
+            </article>
+          ))}
+        </div>
       </div>
+
+      {compact && <a className="secondary-action compact-action" href="/#leaderboards">View full leaderboards</a>}
     </section>
   );
 }
diff --git a/src/components/Leaderboard.test.jsx b/src/components/Leaderboard.test.jsx
new file mode 100644
index 0000000..ef0389b
--- /dev/null
+++ b/src/components/Leaderboard.test.jsx
@@ -0,0 +1,73 @@
+import { cleanup, render, screen } from '@testing-library/react';
+import userEvent from '@testing-library/user-event';
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
+import Leaderboard from './Leaderboard';
+import { fetchLeaderboards } from '../lib/api';
+
+vi.mock('../lib/api', () => ({ fetchLeaderboards: vi.fn() }));
+
+const leaderboards = {
+  lidar: [
+    leaderboardEntry({ submission_id: 'lidar-1', team: 'RowMapper', method: 'ICP Rows', category: 'lidar' }),
+  ],
+  vision: [
+    leaderboardEntry({ submission_id: 'vision-1', team: 'CropLoop', method: 'RGB-D Vineyard', category: 'vision' }),
+  ],
+  combined: [],
+};
+
+describe('Leaderboard', () => {
+  afterEach(cleanup);
+
+  beforeEach(() => {
+    fetchLeaderboards.mockReset();
+    fetchLeaderboards.mockResolvedValue(leaderboards);
+  });
+
+  it('selects a category with an accessible tab and updates its panel', async () => {
+    const user = userEvent.setup();
+    render(<Leaderboard />);
+
+    await screen.findAllByText('RowMapper');
+    await user.click(screen.getByRole('tab', { name: 'Vision SLAM' }));
+
+    expect(screen.getByRole('tab', { name: 'Vision SLAM' })).toHaveAttribute('aria-selected', 'true');
+    expect(screen.getByRole('tabpanel', { name: /vision slam leaderboard/i })).toHaveTextContent('CropLoop');
+  });
+
+  it('offers a full-dashboard action from the compact preview', async () => {
+    render(<Leaderboard compact />);
+
+    expect(await screen.findByRole('link', { name: /view full leaderboards/i })).toHaveAttribute('href', '/#leaderboards');
+    expect(screen.queryByText(/official category rankings use lower ate rmse/i)).not.toBeInTheDocument();
+  });
+
+  it('shows a readable unavailable state when the leaderboard cannot load', async () => {
+    fetchLeaderboards.mockRejectedValue(new Error('offline'));
+    render(<Leaderboard />);
+
+    expect(await screen.findByText(/leaderboard is unavailable/i)).toHaveAttribute('role', 'status');
+  });
+
+  it('renders mobile cards with the key fields from the visible rows', async () => {
+    render(<Leaderboard />);
+
+    const card = await screen.findByTestId('leaderboard-card-lidar-1');
+    expect(card).toHaveTextContent('#1');
+    expect(card).toHaveTextContent('RowMapper');
+    expect(card).toHaveTextContent('ICP Rows');
+    expect(card).toHaveTextContent('0.180 m');
+    expect(card).toHaveTextContent('LiDAR SLAM');
+  });
+});
+
+function leaderboardEntry(entry) {
+  return {
+    rank: 1,
+    ate_rmse: 0.18,
+    rpe_rmse: 0.041,
+    alignment: 'se3',
+    attempt_number: 1,
+    ...entry,
+  };
+}
diff --git a/src/styles.css b/src/styles.css
index 67d34ac..77064b9 100644
--- a/src/styles.css
+++ b/src/styles.css
@@ -306,20 +306,40 @@ footer {
 
 .table-wrap {
   width: 100%;
   overflow-x: auto;
 }
 
 .leaderboard-cards {
   display: none;
 }
 
+.leaderboard-card {
+  display: grid;
+  gap: 0.25rem;
+  padding: 1rem;
+  border: 1px solid rgba(23, 52, 46, 0.12);
+  border-radius: 0.55rem;
+  background: #fffdf7;
+}
+
+.leaderboard-card span {
+  color: #687870;
+}
+
+.leaderboard-card-heading {
+  display: flex;
+  align-items: baseline;
+  justify-content: space-between;
+  gap: 1rem;
+}
+
 table {
   width: 100%;
   min-width: 840px;
   border-collapse: collapse;
 }
 
 th,
 td {
   padding: 0.9rem;
   border-bottom: 1px solid rgba(23, 52, 46, 0.1);
@@ -717,11 +737,15 @@ footer {
 
   .submission-card,
   .evaluation-card {
     padding: 1rem;
   }
 
   .leaderboard-cards {
     display: grid;
     gap: 0.75rem;
   }
+
+  .leaderboard .table-wrap {
+    display: none;
+  }
 }
