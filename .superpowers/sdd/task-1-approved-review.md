# Review package: 5c2387d5423ec127ecc6b8223f8f78305ef0e7f0..HEAD

## Commits
b4c0ff5 fix disabled select appearance
6bd2817 fix: keep mobile leaderboard table visible
b7a53e4 fix: keep admin tables visible on mobile
e4282b6 style: improve responsive interaction primitives

## Files changed
 src/styles.css | 76 ++++++++++++++++++++++++++++++++++++++++++++++++----------
 1 file changed, 64 insertions(+), 12 deletions(-)

## Diff
diff --git a/src/styles.css b/src/styles.css
index 3120553..67d34ac 100644
--- a/src/styles.css
+++ b/src/styles.css
@@ -27,20 +27,36 @@ a {
   color: inherit;
 }
 
 button,
 input,
 select,
 textarea {
   font: inherit;
 }
 
+:focus-visible {
+  outline: 3px solid #6f7f38;
+  outline-offset: 3px;
+}
+
+button:disabled,
+select:disabled {
+  cursor: not-allowed;
+  opacity: 0.5;
+}
+
+button:disabled:hover {
+  filter: none;
+  transform: none;
+}
+
 main {
   overflow: hidden;
 }
 
 .site-nav {
   position: sticky;
   top: 0;
   z-index: 10;
   display: flex;
   align-items: center;
@@ -139,26 +155,20 @@ main {
   text-decoration: none;
   cursor: pointer;
 }
 
 .primary-action {
   border-color: #17342e;
   background: #17342e;
   color: #fffdf7;
 }
 
-.primary-action:disabled,
-.secondary-action:disabled {
-  cursor: not-allowed;
-  opacity: 0.45;
-}
-
 .secondary-action,
 .tab {
   border-color: rgba(23, 52, 46, 0.18);
   background: rgba(255, 253, 247, 0.82);
   color: #243f38;
 }
 
 .tab.active {
   border-color: #17342e;
   background: #d8e3c1;
@@ -292,20 +302,24 @@ footer {
 
 .compact-panel {
   margin-bottom: 2rem;
 }
 
 .table-wrap {
   width: 100%;
   overflow-x: auto;
 }
 
+.leaderboard-cards {
+  display: none;
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
@@ -397,27 +411,40 @@ textarea {
 }
 
 .file-control svg {
   position: absolute;
   right: 0.8rem;
   bottom: 0.85rem;
   color: #6f7f38;
 }
 
 .validation {
-  margin: 0.45rem 0 0;
-  color: #8d3e2f;
+  margin: 0.75rem 0 0;
+  border-left: 0.25rem solid currentColor;
+  color: #6c2d23;
   font-size: 0.9rem;
+  font-weight: 650;
+  line-height: 1.5;
+  padding-left: 0.7rem;
+}
+
+.validation::before {
+  content: "Notice: ";
+  font-weight: 800;
 }
 
 .validation.valid {
-  color: #3f6f33;
+  color: #275a26;
+}
+
+.validation.valid::before {
+  content: "Ready: ";
 }
 
 .panel-note {
   color: #53665f;
   line-height: 1.55;
 }
 
 .success-box {
   display: grid;
   gap: 0.35rem;
@@ -654,22 +681,47 @@ footer {
   }
 
   .photo-card {
     min-height: 24rem;
   }
 }
 
 @media (max-width: 560px) {
   .site-nav div {
     justify-content: flex-start;
+    max-width: 100%;
+    row-gap: 0.5rem;
+  }
+
+  .site-nav a {
+    white-space: nowrap;
   }
 
   .hero h1 {
     font-size: 3rem;
   }
 
-  .primary-action,
-  .secondary-action,
-  .tab {
+  .hero-actions .primary-action,
+  .hero-actions .secondary-action,
+  .submission-card .primary-action {
     width: 100%;
   }
+
+  .tab-list {
+    gap: 0.5rem;
+  }
+
+  .tab {
+    min-height: 2.5rem;
+    padding: 0.65rem 0.8rem;
+  }
+
+  .submission-card,
+  .evaluation-card {
+    padding: 1rem;
+  }
+
+  .leaderboard-cards {
+    display: grid;
+    gap: 0.75rem;
+  }
 }
