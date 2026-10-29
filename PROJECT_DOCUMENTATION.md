# NexGen Conference Management Platform: Holistic Architecture & Project Documentation

This documentation serves as an exhaustive reference guide for the NexGen Conference Management Platform. It is designed to prepare you for technical questioning during your B.Tech Project presentation by covering the problem statement, technological justifications, database schemas, codebase structures, and advanced AI systems.

---

## 1. Project Overview & Scope

### Problem Statement
Traditional academic conference management platforms (like EasyChair or EDAS) often suffer from aging UI paradigms, bloated workflows, and a distinct lack of intelligence. Navigating peer reviews, keeping track of PDF submissions, and detecting fraud (via plagiarism or duplicated researchers) are predominantly manual actions taking up massive amounts of Track Chair hours.

### Solution
NexGen is a strictly modernized, AI-enhanced centralized platform that:
1. Replaces archaic interfaces with a highly responsive, aesthetic glassmorphic Single Page Application.
2. Automates the peer-review lifecycle via real-time logic.
3. Implements **Autonomous Generation (RAG)** systems to allow researchers to dynamically extract data from uploaded PDFs natively. 
4. Introduces a **Local Autonomous AI Agent terminal** where owners can deploy a web-scraping language model locally to perform background checks on newly submitted authors or papers asynchronously.

---

## 2. Technology Stack & Framework Justifications

If asked *why* a particular technology was chosen instead of a famous alternative, reference these defenses:

### Frontend
- **Vanilla Javascript (ES6 Modules)**: Selected over heavy virtual-DOM frameworks like React.js because the platform needed immediate execution speeds for real-time Firebase syncing, minimizing the Javascript bundle payload and avoiding massive web-pack compilation bloat.
- **HTML5 & Vanilla CSS**: Instead of bloating the application with TailwindCSS utility classes, we developed a highly organized, Custom CSS variable repository (`style.css`). This allows global theme switching (Glassmorphism formulas, Flexbox structure) from a single `:root` point without compiling steps.
- **Vite Setup**: Utilized as the build tool to leverage extremely fast Hot Module Replacements (HMR). Using Vite over Webpack or Create-React-App guarantees immediate code-reloads and better minification during the production build.
- **Chart.js**: Implemented natively via CDN for lightweight owner dashboard analytics regarding submission status proportions via a dynamic Doughnut chart without relying on extremely heavy charting engines.

### Backend (BaaS)
- **Firebase V10 SDK (Firestore & Authentication)**: 
  - *Why not a custom Node/SQL backend?* Real-time document syncing. The entire peer-review ecosystem demands that if a Track Chair accepts a paper, the Owner must see that acceptance render instantaneously without a page refresh. Firestore's WebSocket NoSQL architecture enables active snapshot listeners natively.
  - *Google OAuth Integration*: Implemented to drastically lower the friction of creating new academic accounts. Upon login, the system automatically parses their persistent payload and intercepts it to create a predefined default `Author` document in Firestore safely.

### Microservices / AI Backend
- **FastAPI (Python)**: Running locally alongside the Node application. Chosen over Flask/Django for its native async compilation and native OpenAPI documentation capabilities, essential for AI stream chunks.
- **Local Language Models**: Built robustly. It enables an agentic framework capable of understanding the syntax and logic of uploaded user PDFs.

### Notification System
- **EmailJS SDK**: Hooked dynamically on the frontend to push event-driven confirmation emails directly using pre-configured notification templates on their service, effectively allowing reliable transactional emails without configuring custom backend SMTP systems natively.

---

## 3. Detailed Database Schema (Firestore NoSQL)

Due to NoSQL capabilities, documents are organized hierarchically but fetched through independent Collection queries. 

### Collection: `users`
- Security Paradigm: Every physical Auth login is paired symmetrically with a `users` document using the exact same mapping `uid` ensuring complete verification parity.
- **Fields**:
  - `uid` (String): Mapped directly to Firebase Auth system.
  - `email` (String)
  - `role` (String): Strict state enumerations -> `Owner`, `TrackChair`, `Reviewer`, `Author`.
  - `status` (String): Active vs Invited.
  - `expertise` (String): Used primarily for reviewer domain targeting.

### Collection: `papers`
- Storage Paradigm: Central source of truth. All relations flow up towards the paper.
- **Fields**:
  - `title`, `abstract`, `keywords` (String/Array)
  - `paperLink` (String URL - Drive/PDF routing)
  - `authorId`, `authorEmail` (Strings for ownership tracing)
  - `status` (String): Progressively maps to: `Submitted` -> `Awaiting Assignment` -> `Under Review` -> `Awaiting Decision` -> `Accepted/Rejected`.
  - `trackChairRecommendation` / `trackChairComment` (Strings for final stage summaries).

### Collection: `bids`
- **Clever Engineering Metric**: The ID of these documents is created deterministically as `${paperId}_${currentUser.uid}`. This guarantees that a reviewer cannot theoretically submit two bids to the same paper, inherently bypassing complex transaction conflict loops.
- **Fields**: `paperId`, `reviewerId`, `preference` (String).

### Collection: `assignments`
- Defines the active workload between Reviewers and Papers.
- **Fields**: `paperId`, `reviewerId`, `status` (`Pending`, `Accepted`, `Declined`, `Completed`).

### Collection: `reviews`
- Submitted review results decoupled safely from the assignments wrapper.
- **Fields**: `recommendation` (String), `commentsForAuthor` (Public payload), `commentsForChair` (Confidential payload).

---

## 4. Code Architecture & Component Breakdown

### A. `index.html` - The SPA Layout
- **Single Page Application (SPA)**: It functions without ever refreshing the window. It works strictly through CSS Class toggling (`.view` and `.active`).
- **Modals**: Instead of heavy component-mounts, modals (`assign-reviewer-modal`, `letter-modal`) rest silently at the absolute bottom of the DOM file and use absolute positioning z-index layering when triggered dynamically by javascript.
- **AI Sidebar Hub**: Integrated explicitly onto the global shell canvas utilizing CSS grid flex layouts avoiding overlapping with crucial dashboard data. 

### B. `style.css` - UI Design Core
- **Glassmorphism Principle**: Every panel relies on `rgba(255,255,255, 0.7)` bounds paired with `backdrop-filter: blur(10px)` and subtle box-shadows. This provides spatial depth and an ultra-modern corporate look.
- **Theme Variables**: Utilizes `:root { --primary: #... }` ensuring changes to brand identity color scales instantly propagate to massive volumes of nested buttons without manual searching.
- **Alternating Table Data**: Specifically uses `#nth-child(odd)` / `even` to alternate papers directly traversing pink vs indigo gradients to eliminate user cognitive overlap when staring at rows of data. 

### C. `main.js` - Logic Engine
- Highly structured mapping containing separated initializer function hooks: `initOwnerView()`, `initAuthorView()`, `initTrackChairView()`, `initReviewerView()`. 
- **Global Event Listeners**: Note that we almost **never** map event listeners manually inside `forEach` loops when building DOM nodes because that triggers massive RAM memory leaks (thousands of loose listeners). Instead, the system uses a highly optimized **Event Delegation Strategy**. We map the listener onto the entire HTML `body`, checking `e.target.closest('.button-class')` saving immense overhead!

---

## 5. Core Functions Deep Dive

If asked how a specific process executes natively:

### Auth Observer: `onAuthStateChanged`
- The system is natively resilient. If a Google OAuth user attempts to log in via popup, this native observer fires globally. It catches the valid Google Auth payload and systematically parses the Firestore `users` collection to retrieve their custom profile document.
- **Invited User Interception**: If an Owner registers an email as "Invited", and that email logs into the app, the observer dynamically locates the `Invited` pending database node, rewrites its document payload mapping it safely merging to their newly verified Google authentication `uid` automatically.

### Global Smart Search (`main.js` line ~1740)
- Implemented as an imperative input listener. It intercepts user keyboard typing inputs, maps their target query container, forces `.toLowerCase()` against all `textContent` recursively in a `.paper-item` array structure, and uses inline CSS style overrides `display: none` to create an instantaneous list response without pinging the database payload.

---

## 6. The Peer Review Lifecycle Engine

If asked how the platform handles standard life cycle workflow mechanisms, use this rigid structure path:
1. **Submission**: Author provides `papers` Node with raw state `Submitted`.
2. **Reviewer Bidding**: Reviewers utilize their tab to submit conflict checks/bid metrics mapping directly into the `bids` Collection cleanly mapping via deterministic IDs!
3. **Owner Routing**: The Owner views global load statistics. Utilizes a multi-option select hook mapped to `trackChair` users pushing custom assignments directly dynamically. Wait status changes to `Awaiting Assignment`. 
4. **TC Routing**: The Track Chair receives the paper, analyzes Bid overlays alongside reviewer profiles tracking domains, and dispatches the paper directly mapping local multi-review `assignments`.
5. **Lock-step Reviews**: The system initiates aggressive locking checks inside `checkAndUpdatePaperStatus()`. Every time any reviewer submits a `Completed` node, it parses every current mapping to the paper. ONLY if all nodes read back complete will the parent state snap strictly to `Awaiting Decision`.
6. **Decision Processing**: Track Chair evaluates the combined outputs cleanly dropping a `Recommendation`. The Owner finally clicks Accept/Reject natively, instantly resolving the document sequence mapping.

---

## 7. Artificial Intelligence Infrastructure

### Agent Protocol Runtime
- Utilizing Python paradigms running on the local FastAPI interface, it spawns autonomous task loops parsing through LLMs allowing the system to logically parse an instruction (e.g., "Research plagiarism history of Author XYZ") generating a functional execution pipeline. 

### RAG Protocol (Retrieval-Augmented Generation)
- **Upload Flow**: Uploaded PDFs process through robust python pipelines parsing binary PDF characters to plaintext strings.
- **Vector Chunks**: Embeddings are implemented by slicing immense documents into tight contextual arrays natively preserving metadata overlap bounds securely ensuring high similarity cosine matches.
- **Chat Injection**: User queries intercept database contexts natively prepending context directly onto generative prompts ensuring strict document reference truth bypassing base knowledge hallucinations natively.
