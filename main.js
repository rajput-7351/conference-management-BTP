// // --- FIREBASE IMPORTS ---
// import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
// import {
//     getAuth,
//     createUserWithEmailAndPassword,
//     signInWithEmailAndPassword,
//     onAuthStateChanged,
//     signOut
// } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// import {
//     getFirestore,
//     doc,
//     setDoc,
//     getDoc,
//     addDoc,
//     collection,
//     query,
//     where,
//     onSnapshot,
//     updateDoc,
//     serverTimestamp,
//     getDocs
// } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// // --- FIREBASE CONFIGURATION ---
// // Vite replaces these variables with the values from your .env.local file
// const firebaseConfig = {
//     apiKey: import.meta.env.VITE_API_KEY,
//     authDomain: import.meta.env.VITE_AUTH_DOMAIN,
//     projectId: import.meta.env.VITE_PROJECT_ID,
//     storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
//     messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
//     appId: import.meta.env.VITE_APP_ID
// };


// // --- INITIALIZE FIREBASE ---
// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);
// const db = getFirestore(app);

// // --- GLOBAL STATE ---
// let currentUser = null;
// let currentUserRole = null;
// let unsubscribeListeners = []; // To detach listeners on logout

// // --- UI ELEMENTS ---
// const views = document.querySelectorAll('.view');
// const authView = document.getElementById('auth-view');
// const loadingView = document.getElementById('loading-view');
// const logoutBtn = document.getElementById('logout-btn');
// const userEmailDisplay = document.getElementById('user-email-display');
// const userRoleDisplay = document.getElementById('user-role-display');

// // Application-specific elements
// const submitPaperForm = document.getElementById('submit-paper-form');
// const addUserForm = document.getElementById('add-user-form');
// const ownerPapersList = document.getElementById('owner-papers-list');
// const trackChairPapersList = document.getElementById('track-chair-papers-list');
// const reviewerPapersList = document.getElementById('reviewer-papers-list');
// const authorPapersList = document.getElementById('author-papers-list');
// const exportCsvBtn = document.getElementById('export-csv-btn');


// // Modals and their controls
// const assignModal = document.getElementById('assign-reviewer-modal');
// const reviewerSelect = document.getElementById('reviewer-select');
// const reviewModal = document.getElementById('submit-review-modal');
// const submitReviewForm = document.getElementById('submit-review-form');
// const viewReviewsModal = document.getElementById('view-reviews-modal');


// // --- UTILITY FUNCTIONS ---
// const showView = (viewId) => {
//     views.forEach(view => {
//         view.classList.remove('active');
//     });
//     document.getElementById(viewId).classList.add('active');
// };

// const getStatusBadge = (status) => {
//      const colors = {
//         'Submitted': 'bg-blue-100 text-blue-800',
//         'Awaiting Assignment': 'bg-yellow-100 text-yellow-800',
//         'Under Review': 'bg-purple-100 text-purple-800',
//         'Awaiting Decision': 'bg-orange-100 text-orange-800',
//         'Accepted': 'bg-green-100 text-green-800',
//         'Rejected': 'bg-red-100 text-red-800',
//         'Pending': 'bg-gray-100 text-gray-800',
//         'Completed': 'bg-green-100 text-green-800',
//         'Declined': 'bg-red-100 text-red-800'
//     };
//     return `<span class="px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}">${status}</span>`;
// };

// // --- MOCK EMAIL FUNCTION ---
// const sendEmailNotification = (to, subject, body) => {
//     console.log("--- EMAIL SIMULATION ---");
//     console.log(`To: ${to}`);
//     console.log(`Subject: ${subject}`);
//     console.log(`Body: ${body}`);
//     console.log("------------------------");
// }

// // --- NEW UTILITY FUNCTION ---
// // Checks all assignments for a paper and updates the paper's overall status
// // if all reviews are completed or declined.
// async function checkAndUpdatePaperStatus(paperId) {
//     const paperAssignmentsQuery = query(collection(db, 'assignments'), where('paperId', '==', paperId));
//     const assignmentSnapshot = await getDocs(paperAssignmentsQuery);
    
//     if (assignmentSnapshot.empty) {
//         return; // No assignments for this paper.
//     }
    
//     let allReviewsAreIn = true;
//     assignmentSnapshot.forEach(doc => {
//         const status = doc.data().status;
//         // If any review is still pending or accepted (but not completed), not all are in.
//         if (status === 'Pending' || status === 'Accepted') {
//             allReviewsAreIn = false;
//         }
//     });

//     if (allReviewsAreIn) {
//         const paperRef = doc(db, 'papers', paperId);
//         await updateDoc(paperRef, { status: 'Awaiting Decision' });
//         console.log(`All reviews for paper ${paperId} are accounted for. Status updated to 'Awaiting Decision'.`);
//     }
// }

// // --- AUTHENTICATION LOGIC ---
// const authForm = document.getElementById('auth-form');
// const emailInput = document.getElementById('email');
// const passwordInput = document.getElementById('password');
// const roleSelection = document.getElementById('role-selection');
// const roleSelect = document.getElementById('role');
// const loginBtn = document.getElementById('login-btn');
// const signupBtn = document.getElementById('signup-btn');
// const authError = document.getElementById('auth-error');

// signupBtn.addEventListener('click', async () => {
//     roleSelection.style.display = 'block';
//     authError.textContent = '';
//     const email = emailInput.value;
//     const password = passwordInput.value;

//     if (!email || !password) {
//         authError.textContent = 'Please enter email and password.';
//         return;
//     }
//     try {
//         // Step 1: Create the Auth user. This is the only part that can fail with 'email-already-in-use'.
//         const userCredential = await createUserWithEmailAndPassword(auth, email, password);
//         const user = userCredential.user;

//         // Step 2: Auth user was created. Now handle the Firestore document.
//         const usersRef = collection(db, "users");
//         // Look for an 'invited' doc for this email.
//         const q = query(usersRef, where("email", "==", email), where("status", "==", "invited"));
//         const querySnapshot = await getDocs(q);

//         let userRole = 'Author'; // Default role

//         if (!querySnapshot.empty) {
//             // Found an invitation. We'll update this doc to become the real user doc.
//             const invitedDoc = querySnapshot.docs[0];
//             userRole = invitedDoc.data().role;
//             await updateDoc(doc(db, "users", invitedDoc.id), {
//                 uid: user.uid,
//                 status: 'active'
//             });
//         } else {
//             // No invitation found. This is a regular user signing up.
//             if (email === 'owner@conference.com') { userRole = 'Owner'; }
//             // We will create a new doc for them, using their UID as the doc ID.
//             await setDoc(doc(db, "users", user.uid), {
//                 email: user.email,
//                 role: userRole,
//                 uid: user.uid,
//                 status: 'active'
//             });
//         }

//         console.log("User signed up and profile created with role:", userRole);
//         roleSelection.style.display = 'none';

//     } catch (error) {
//         if (error.code === 'auth/email-already-in-use') {
//             authError.textContent = 'This email is already registered. Please use the Log In button.';
//         } else {
//             authError.textContent = error.message;
//         }
//     }
// });

// loginBtn.addEventListener('click', async () => {
//     authError.textContent = '';
//     roleSelection.style.display = 'none';
//     if (!emailInput.value || !passwordInput.value) {
//         authError.textContent = 'Please enter email and password.';
//         return;
//     }
//     try {
//         await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
//         console.log("User logged in.");
//     } catch (error) {
//         authError.textContent = error.message;
//     }
// });

// logoutBtn.addEventListener('click', async () => {
//     await signOut(auth);
//     console.log("User logged out.");
// });

//                 // --- AUTH STATE OBSERVER ---
//         onAuthStateChanged(auth, async (user) => {
//             // Cleanup old listeners
//             unsubscribeListeners.forEach(unsub => unsub());
//             unsubscribeListeners = [];

//             if (user) {
//                 currentUser = user;
                
//                 // Fetch the user's document directly by their UID.
//                 const userDocRef = doc(db, "users", user.uid);
//                 const userDocSnap = await getDoc(userDocRef);

//                 if (userDocSnap.exists()) {
//                     // --- User document was found ---
//                     const userData = userDocSnap.data();
//                     currentUserRole = userData.role;
//                     userEmailDisplay.textContent = user.email;
//                     userRoleDisplay.textContent = `Role: ${currentUserRole}`;
//                     logoutBtn.style.display = 'block';
//                     setupUIForRole(currentUserRole);

//                 } else {
//                     // --- No user document found ---
//                     // This is normal for a first-time signup.
//                     // We will check if they were invited, or create a default (Author/Owner) doc.

//                     const usersRef = collection(db, "users");
//                     const q = query(usersRef, where("email", "==", user.email), where("status", "==", "invited"));
//                     const querySnapshot = await getDocs(q);

//                     if (!querySnapshot.empty) {
//                         // This is an invited user signing up. Let's update their 'invited' doc.
//                         const invitedDoc = querySnapshot.docs[0];
//                         await updateDoc(doc(db, "users", invitedDoc.id), {
//                             uid: user.uid,
//                             status: 'active'
//                         });
//                         // Now we also create their main user doc at /users/{uid}
//                         const newRole = invitedDoc.data().role;
//                         await setDoc(userDocRef, {
//                             email: user.email,
//                             role: newRole,
//                             uid: user.uid,
//                             status: 'active'
//                         });
                        
//                         currentUserRole = newRole;
//                         userEmailDisplay.textContent = user.email;
//                         userRoleDisplay.textContent = `Role: ${currentUserRole}`;
//                         logoutBtn.style.display = 'block';
//                         setupUIForRole(currentUserRole);

//                     } else if (user.email === 'owner@conference.com') {
//                          // Special case: First time the owner signs up
//                         await setDoc(userDocRef, {
//                             email: user.email,
//                             role: 'Owner',
//                             uid: user.uid,
//                             status: 'active'
//                         });
//                         currentUserRole = 'Owner';
//                         userEmailDisplay.textContent = user.email;
//                         userRoleDisplay.textContent = `Role: ${currentUserRole}`;
//                         logoutBtn.style.display = 'block';
//                         setupUIForRole(currentUserRole);
                    
//                     } else {
//                          // Standard new Author signup
//                          await setDoc(userDocRef, {
//                             email: user.email,
//                             role: 'Author',
//                             uid: user.uid,
//                             status: 'active'
//                         });
//                         currentUserRole = 'Author';
//                         userEmailDisplay.textContent = user.email;
//                         userRoleDisplay.textContent = `Role: ${currentUserRole}`;
//                         logoutBtn.style.display = 'block';
//                         setupUIForRole(currentUserRole);
//                     }
//                 }
//             } else {
//                 // User is logged out
//                 currentUser = null;
//                 currentUserRole = null;
//                 userEmailDisplay.textContent = '';
//                 userRoleDisplay.textContent = '';
//                 logoutBtn.style.display = 'none';
//                 showView('auth-view');
//             }
//         });




// // --- ROLE-BASED UI SETUP ---
// const setupUIForRole = (role) => {
//     showView('loading-view');
//     // Delay to show loading and allow data to fetch
//     setTimeout(() => {
//         switch (role) {
//             case 'Author':
//                 showView('author-view');
//                 initAuthorView();
//                 break;
//             case 'Owner':
//                 showView('owner-view');
//                 initOwnerView();
//                 break;
//             case 'TrackChair':
//                 showView('track-chair-view');
//                 initTrackChairView();
//                 break;
//             case 'Reviewer':
//                 showView('reviewer-view');
//                 initReviewerView();
//                 break;
//             default:
//                 showView('auth-view');
//                 break;
//         }
//     }, 500);
// };

// // --- APPLICATION EVENT LISTENERS (ATTACHED ONCE) ---

// // Author: Submit Paper
// submitPaperForm.addEventListener('submit', async (e) => {
//     e.preventDefault();
//     const title = document.getElementById('paper-title').value;
//     const abstract = document.getElementById('paper-abstract').value;
//     const keywords = document.getElementById('paper-keywords').value;
//     const paperLink = document.getElementById('paper-link').value;

//     try {
//         await addDoc(collection(db, 'papers'), {
//             title,
//             abstract,
//             keywords: keywords.split(',').map(k => k.trim()),
//             paperLink,
//             authorId: currentUser.uid,
//             authorEmail: currentUser.email,
//             status: 'Submitted',
//             submittedAt: serverTimestamp(),
//         });
//         submitPaperForm.reset();
//         alert('Paper submitted successfully!');
//     } catch(error) {
//         console.error("Error submitting paper: ", error);
//         alert('Failed to submit paper.');
//     }
// });

// // Owner: Add new user (TrackChair or Reviewer)
// addUserForm.addEventListener('submit', async (e) => {
//     e.preventDefault();
//     const email = document.getElementById('new-user-email').value;
//     const role = document.getElementById('new-user-role').value;
    
//     if (!email) {
//         alert("Please enter an email.");
//         return;
//     }

//     try {
//         const usersRef = collection(db, "users");
//         const q = query(usersRef, where("email", "==", email));
//         const querySnapshot = await getDocs(q);
//         let alertMessage = '';

//         if (!querySnapshot.empty) {
//             // A document for this email already exists. Update its role.
//             const userDoc = querySnapshot.docs[0];
//             await updateDoc(doc(db, "users", userDoc.id), { role: role });
//             alertMessage = `Updated role for existing user ${email} to ${role}. They can now log in to see their new dashboard.`;
//         } else {
//             // No document for this email exists. Create an 'invitation' document.
//             await addDoc(collection(db, "users"), {
//                 email: email,
//                 role: role,
//                 uid: null, // UID will be added when the user signs up
//                 status: 'invited'
//             });
//             alertMessage = `Invitation sent to ${email} as a ${role}. They can now sign up on the main page.`;
//         }
        
//         sendEmailNotification(
//             email, 
//             "Your Conference Tool Role Has Been Set",
//             `Hello, \nYour role for the conference has been set to ${role}. Please log in or sign up to continue.`
//         );
//         alert(alertMessage);
//         addUserForm.reset();
//     } catch(error) {
//         console.error("Error managing user role:", error);
//         alert("Failed to manage user role.");
//     }
// });

// // Owner: Event Delegation for paper list actions
// ownerPapersList.addEventListener('click', async (e) => {
//     // Assign Track Chair
//     if (e.target.classList.contains('assign-tc-btn')) {
//         const paperId = e.target.dataset.paperId;
//         const selectEl = document.querySelector(`.assign-tc-select[data-paper-id='${paperId}']`);
//         const selectedValue = selectEl.value;
//         if (!selectedValue) {
//             alert("Please select a Track Chair.");
//             return;
//         }
        
//         const [trackChairId, trackChairEmail] = selectedValue.split('|');

//         try {
//             const paperRef = doc(db, 'papers', paperId);
//             await updateDoc(paperRef, { trackChairId, trackChairEmail, status: 'Awaiting Assignment' });
            
//             const paperDoc = await getDoc(paperRef);
//             const paperData = paperDoc.data();
            
//             sendEmailNotification(
//                 trackChairEmail,
//                 "New Paper Assignment",
//                 `Hello ${trackChairEmail},\n\nYou have been assigned a new paper titled "${paperData.title}" to manage.\nPlease log in to assign reviewers.`
//             );
            
//             alert("Paper assigned successfully.");
//         } catch (error) {
//             console.error("Error assigning paper:", error);
//             alert("Failed to assign paper.");
//         }
//     }

//     // View Reviews
//     if (e.target.classList.contains('view-reviews-btn')) {
//         const paperId = e.target.dataset.paperId;
//         const paperTitle = e.target.dataset.paperTitle;
//         document.getElementById('reviews-modal-paper-title').textContent = paperTitle;
//         const contentDiv = document.getElementById('reviews-modal-content');
//         contentDiv.innerHTML = '<p>Loading reviews...</p>';
//         viewReviewsModal.style.display = 'block';

//         const reviewsQuery = query(collection(db, 'reviews'), where('paperId', '==', paperId));
//         const reviewSnapshot = await getDocs(reviewsQuery);
        
//         if (reviewSnapshot.empty) {
//             contentDiv.innerHTML = '<p>No reviews have been submitted for this paper yet.</p>';
//             return;
//         }

//         contentDiv.innerHTML = '';
//         let reviewCounter = 1;
//         reviewSnapshot.forEach(reviewDoc => {
//             const review = reviewDoc.data();
//             const reviewEl = document.createElement('div');
//             reviewEl.className = 'p-3 border rounded-md bg-white';
//             reviewEl.innerHTML = `
//                 <h5 class="font-bold text-md">Review ${reviewCounter++}</h5>
//                 <p class="text-sm font-semibold mt-2">Recommendation: <span class="font-normal">${review.recommendation}</span></p>
//                 <p class="text-sm font-semibold mt-2">Comments for Author:</p>
//                 <p class="text-sm p-2 bg-gray-100 rounded">${review.commentsForAuthor}</p>
//                 <p class="text-sm font-semibold mt-2">Confidential Comments for Chair:</p>
//                 <p class="text-sm p-2 bg-gray-100 rounded">${review.commentsForChair || 'None'}</p>
//             `;
//             contentDiv.appendChild(reviewEl);
//         });
//     }

//     // Make Final Decision
//     if (e.target.classList.contains('decision-btn')) {
//         const paperId = e.target.dataset.paperId;
//         const decision = e.target.dataset.decision; // 'Accepted' or 'Rejected'

//         if (confirm(`Are you sure you want to ${decision.toLowerCase()} this paper?`)) {
//             try {
//                 const paperRef = doc(db, 'papers', paperId);
//                 await updateDoc(paperRef, { status: decision });

//                 const paperDoc = await getDoc(paperRef);
//                 const paperData = paperDoc.data();
                
//                 sendEmailNotification(
//                     paperData.authorEmail,
//                     `Decision on your paper: "${paperData.title}"`,
//                     `Dear Author,\n\nA decision has been made on your paper, "${paperData.title}". The final decision is: ${decision}.\nPlease log in to view feedback.`
//                 );

//                 alert(`Paper has been ${decision.toLowerCase()}.`);
//             } catch (error) {
//                 console.error('Error making decision:', error);
//                 alert('Failed to make a decision.');
//             }
//         }
//     }

//     // View Paper Link
//     if (e.target.classList.contains('view-paper-link-btn')) {
//         const paperLink = e.target.dataset.paperLink;
//         if (paperLink) {
//             window.open(paperLink, '_blank');
//         } else {
//             alert("No paper link was provided for this submission.");
//         }
//     }
// });

// // Track Chair: Event Delegation for paper list actions
// trackChairPapersList.addEventListener('click', async (e) => {
//     // Open "Assign Reviewer" modal
//     if(e.target.classList.contains('assign-rev-btn')) {
//         const paperId = e.target.dataset.paperId;
//         const paperTitle = e.target.dataset.paperTitle;
        
//         document.getElementById('modal-paper-id').value = paperId;
//         document.getElementById('modal-paper-title').textContent = `Paper: ${paperTitle}`;
        
//         // Populate reviewers
//         const revQuery = query(collection(db, "users"), where("role", "==", "Reviewer"), where("status", "==", "active"));
//         const revSnapshot = await getDocs(revQuery);
//         reviewerSelect.innerHTML = '';
//         revSnapshot.forEach(doc => {
//             const reviewer = doc.data();
//             if(reviewer.uid){ // Ensure reviewer has signed up
//                 const option = new Option(`${reviewer.email}`, `${reviewer.uid}|${reviewer.email}`);
//                 reviewerSelect.add(option);
//             }
//         });
        
//         assignModal.style.display = 'block';
//     }

//     // View Paper Link
//     if (e.target.classList.contains('view-paper-link-btn')) {
//         const paperLink = e.target.dataset.paperLink;
//         if (paperLink) {
//             window.open(paperLink, '_blank');
//         } else {
//             alert("No paper link was provided for this submission.");
//         }
//     }
// });

// // Track Chair: Assign Reviewer Modal buttons
// document.getElementById('cancel-assign-btn').addEventListener('click', () => {
//     assignModal.style.display = 'none';
// });

// document.getElementById('confirm-assign-btn').addEventListener('click', async () => {
//     const paperId = document.getElementById('modal-paper-id').value;
//     const selectedOptions = Array.from(reviewerSelect.selectedOptions);
//     if (selectedOptions.length === 0) {
//         alert('Please select at least one reviewer.');
//         return;
//     }

//     const paperRef = doc(db, 'papers', paperId);
//     const paperDoc = await getDoc(paperRef);
//     const paperData = paperDoc.data();

//     const assignments = selectedOptions.map(opt => {
//          const [reviewerId, reviewerEmail] = opt.value.split('|');
//          return {
//              paperId,
//              paperTitle: paperData.title,
//              reviewerId,
//              reviewerEmail,
//              trackChairId: currentUser.uid,
//              status: 'Pending',
//              assignedAt: serverTimestamp()
//          };
//     });
    
//     // Create assignment docs and update paper status
//     const batchPromises = assignments.map(async (assignment) => {
//         await addDoc(collection(db, 'assignments'), assignment);
//         sendEmailNotification(
//             assignment.reviewerEmail, 
//             "You have a new review request",
//             `Hello ${assignment.reviewerEmail},\n\nYou have been requested to review the paper "${assignment.paperTitle}". Please log in to accept or decline.`
//         );
//     });
    
//     await Promise.all(batchPromises);
    
//     // Update paper with reviewer info for display
//     const reviewerInfoForPaper = assignments.map(a => ({uid: a.reviewerId, email: a.reviewerEmail, status: 'Pending'}));
//     await updateDoc(paperRef, {
//         status: 'Under Review',
//         reviewers: reviewerInfoForPaper
//     });
    
//     assignModal.style.display = 'none';
//     alert('Reviewers assigned successfully.');
// });

// // Reviewer: Accept/Decline/Submit buttons (event delegation)
// reviewerPapersList.addEventListener('click', async (e) => {
//     // Handle view paper link button
//     if (e.target.classList.contains('view-paper-link-btn')) {
//         const paperLink = e.target.dataset.paperLink;
//         if (paperLink) {
//             window.open(paperLink, '_blank');
//         } else {
//             alert("No paper link was provided for this submission.");
//         }
//         return;
//     }

//     const assignmentId = e.target.dataset.assignmentId;
//     if (!assignmentId) return;

//     const assignmentRef = doc(db, 'assignments', assignmentId);
//     const assignmentDoc = await getDoc(assignmentRef);
//     const assignmentData = assignmentDoc.data();
//     const paperRef = doc(db, 'papers', assignmentData.paperId);

//     async function updatePaperReviewerStatus(newStatus) {
//         const paperDoc = await getDoc(paperRef);
//         const paperData = paperDoc.data();
//         if (paperData.reviewers && Array.isArray(paperData.reviewers)) {
//             const updatedReviewers = paperData.reviewers.map(r => {
//                 if (r.uid === currentUser.uid) {
//                     return { ...r, status: newStatus };
//                 }
//                 return r;
//             });
//             await updateDoc(paperRef, { reviewers: updatedReviewers });
//         }
//     }
    
//     if(e.target.classList.contains('accept-review-btn')) {
//         await updateDoc(assignmentRef, { status: 'Accepted' });
//         await updatePaperReviewerStatus('Accepted');
//         alert('Review accepted.');
//     }
    
//     if(e.target.classList.contains('decline-review-btn')) {
//         await updateDoc(assignmentRef, { status: 'Declined' });
//         await updatePaperReviewerStatus('Declined');
//         await checkAndUpdatePaperStatus(assignmentData.paperId); // Check status on decline
//         alert('Review declined.');
//     }
    
//     if(e.target.classList.contains('submit-review-btn')) {
//         const paperId = e.target.dataset.paperId;
//         const paperTitle = e.target.dataset.paperTitle;
        
//         document.getElementById('review-modal-paper-id').value = paperId;
//         document.getElementById('review-modal-assignment-id').value = assignmentId;
//         document.getElementById('review-modal-paper-title').textContent = `Paper: ${paperTitle}`;
//         reviewModal.style.display = 'block';
//     }
// });

// // Reviewer: Submit Review Modal buttons
// document.getElementById('cancel-review-btn').addEventListener('click', () => {
//     reviewModal.style.display = 'none';
// });

// submitReviewForm.addEventListener('submit', async (e) => {
//     e.preventDefault();
//     const paperId = document.getElementById('review-modal-paper-id').value;
//     const assignmentId = document.getElementById('review-modal-assignment-id').value;
    
//     const reviewData = {
//         paperId: paperId,
//         reviewerId: currentUser.uid,
//         assignmentId: assignmentId,
//         recommendation: document.getElementById('review-recommendation').value,
//         commentsForAuthor: document.getElementById('review-comments-author').value,
//         commentsForChair: document.getElementById('review-comments-confidential').value,
//         submittedAt: serverTimestamp()
//     };

//     try {
//         // Add review to a new collection
//         await addDoc(collection(db, 'reviews'), reviewData);
        
//         // Update assignment status
//         const assignmentRef = doc(db, 'assignments', assignmentId);
//         await updateDoc(assignmentRef, { status: 'Completed' });

//         // Update reviewer status on the paper itself
//         const paperRef = doc(db, 'papers', paperId);
//         const paperDoc = await getDoc(paperRef);
//         const paperData = paperDoc.data();
//         if (paperData.reviewers && Array.isArray(paperData.reviewers)) {
//             const updatedReviewers = paperData.reviewers.map(r => {
//                 if (r.uid === currentUser.uid) {
//                     return { ...r, status: 'Completed' };
//                 }
//                 return r;
//             });
//             await updateDoc(paperRef, { reviewers: updatedReviewers });
//         }
        
//         reviewModal.style.display = 'none';
//         document.getElementById('submit-review-form').reset();
//         alert("Review submitted successfully!");

//         // Check if all reviews for this paper are done
//         await checkAndUpdatePaperStatus(paperId);

//     } catch(error) {
//         console.error("Error submitting review: ", error);
//         alert("Failed to submit review.");
//     }
// });

// // Close View Reviews Modal
// document.getElementById('close-reviews-modal-btn').addEventListener('click', () => {
//     viewReviewsModal.style.display = 'none';
// });

// // Author: View Decision & Feedback
// authorPapersList.addEventListener('click', async (e) => {
//     if (e.target.classList.contains('view-decision-btn')) {
//         const paperId = e.target.dataset.paperId;
//         const paperTitle = e.target.dataset.paperTitle;
//         document.getElementById('reviews-modal-paper-title').textContent = paperTitle;
//         const contentDiv = document.getElementById('reviews-modal-content');
//         contentDiv.innerHTML = '<p>Loading feedback...</p>';
//         viewReviewsModal.style.display = 'block';

//         const reviewsQuery = query(collection(db, 'reviews'), where('paperId', '==', paperId));
//         const reviewSnapshot = await getDocs(reviewsQuery);
        
//         if (reviewSnapshot.empty) {
//             contentDiv.innerHTML = '<p>No feedback is available for this paper yet.</p>';
//             return;
//         }

//         contentDiv.innerHTML = '';
//         let reviewCounter = 1;
//         reviewSnapshot.forEach(reviewDoc => {
//             const review = reviewDoc.data();
//             const reviewEl = document.createElement('div');
//             reviewEl.className = 'p-3 border rounded-md bg-white';
//             reviewEl.innerHTML = `
//                 <h5 class="font-bold text-md">Feedback from Reviewer ${reviewCounter++}</h5>
//                 <p class="text-sm p-2 bg-gray-100 rounded mt-2">${review.commentsForAuthor}</p>
//             `;
//             contentDiv.appendChild(reviewEl);
//         });
//     }
// });

// // Owner: Export to CSV
// exportCsvBtn.addEventListener('click', async () => {
//     const papersQuery = query(collection(db, "papers"));
//     const snapshot = await getDocs(papersQuery);
//     if (snapshot.empty) {
//         alert("No papers to export.");
//         return;
//     }

//     let csvContent = "data:text/csv;charset=utf-8,";
//     // Define headers
//     const headers = [
//         "Paper Title",
//         "Author Email",
//         "Status",
//         "Submission Date",
//         "Paper Link",
//         "Assigned Track Chair",
//         "Assigned Reviewers"
//     ];
//     csvContent += headers.join(",") + "\r\n";

//     snapshot.forEach(doc => {
//         const paper = doc.data();
//         const reviewers = (paper.reviewers || []).map(r => r.email).join("; "); // Use semicolon to avoid comma issues
//         const submissionDate = paper.submittedAt ? new Date(paper.submittedAt.seconds * 1000).toLocaleDateString() : "N/A";
        
//         // Escape commas and quotes in title
//         const escapeCsv = (str) => `"${(str || '').replace(/"/g, '""')}"`;

//         const row = [
//             escapeCsv(paper.title),
//             escapeCsv(paper.authorEmail),
//             escapeCsv(paper.status),
//             submissionDate,
//             escapeCsv(paper.paperLink),
//             escapeCsv(paper.trackChairEmail),
//             escapeCsv(reviewers)
//         ];
//         csvContent += row.join(",") + "\r\n";
//     });

//     // Create and trigger download
//     const encodedUri = encodeURI(csvContent);
//     const link = document.createElement("a");
//     link.setAttribute("href", encodedUri);
//     link.setAttribute("download", "conference_papers_export.csv");
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
// });


// // --- AUTHOR VIEW LOGIC ---
// function initAuthorView() {
//     // Listen for this author's papers
//     const q = query(collection(db, 'papers'), where('authorId', '==', currentUser.uid));
//     const unsubscribe = onSnapshot(q, (querySnapshot) => {
//         authorPapersList.innerHTML = '';
//         if(querySnapshot.empty){
//             authorPapersList.innerHTML = '<p class="text-gray-500">You have not submitted any papers yet.</p>';
//             return;
//         }
//         querySnapshot.forEach(doc => {
//             const paper = { id: doc.id, ...doc.data()};
//             const paperEl = document.createElement('div');
//             paperEl.className = 'p-4 border rounded-md bg-gray-50';
            
//             let decisionHTML = '';
//             if (paper.status === 'Accepted' || paper.status === 'Rejected') {
//                 decisionHTML = `<button data-paper-id="${paper.id}" data-paper-title="${paper.title}" class="view-decision-btn mt-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-1 px-3 rounded-md text-sm">View Decision & Feedback</button>`;
//             }

//             paperEl.innerHTML = `
//                 <div class="flex justify-between items-start">
//                    <div>
//                         <h4 class="font-bold">${paper.title}</h4>
//                         <p class="text-sm text-gray-600">${paper.abstract.substring(0, 100)}...</p>
//                         ${decisionHTML}
//                     </div>
//                     ${getStatusBadge(paper.status)}
//                 </div>
//             `;
//             authorPapersList.appendChild(paperEl);
//         });
//     });
//     unsubscribeListeners.push(unsubscribe);
// }

// // --- OWNER VIEW LOGIC ---
// function initOwnerView() {
//     const trackChairsList = document.getElementById('track-chairs-list');
//     const reviewersList = document.getElementById('reviewers-list');
    
//     // Listen for users and populate lists
//     const usersQuery = query(collection(db, 'users'));
//     const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
//         trackChairsList.innerHTML = '';
//         reviewersList.innerHTML = '';
//         snapshot.forEach(doc => {
//             const user = doc.data();
//             const li = document.createElement('li');
//             li.textContent = user.email;
//             if(user.role === 'TrackChair') {
//                 trackChairsList.appendChild(li);
//             } else if (user.role === 'Reviewer') {
//                 reviewersList.appendChild(li);
//             }
//         });
//     });
//     unsubscribeListeners.push(unsubUsers);

//     // Listen for all papers
//     const papersQuery = query(collection(db, 'papers'));
//     const unsubPapers = onSnapshot(papersQuery, async (snapshot) => {
//         ownerPapersList.innerHTML = '';
//         let total = 0, needsAssignment = 0, underReview = 0, awaitingDecision = 0;
        
//         const trackChairs = [];
//         const tcQuery = query(collection(db, "users"), where("role", "==", "TrackChair"), where("status", "==", "active"));
//         const tcSnapshot = await getDocs(tcQuery);
//         tcSnapshot.forEach(doc => trackChairs.push({ id: doc.id, ...doc.data() }));

//         snapshot.forEach(doc => {
//             total++;
//             const paper = { id: doc.id, ...doc.data() };
            
//             if(paper.status === 'Submitted') needsAssignment++;
//             if(paper.status === 'Under Review') underReview++;
//             if(paper.status === 'Awaiting Decision') awaitingDecision++;

//             const paperEl = document.createElement('div');
//             paperEl.className = 'p-4 border rounded-md bg-gray-50';
//             let actionHTML = '';
//             if (paper.status === 'Submitted') {
//                  const options = trackChairs.map(tc => `<option value="${tc.uid}|${tc.email}">${tc.email}</option>`).join('');
//                  actionHTML = `
//                     <div class="mt-4 flex items-center space-x-2">
//                         <select data-paper-id="${paper.id}" class="assign-tc-select w-full p-2 border rounded-md">
//                             <option value="">Assign to Track Chair...</option>
//                             ${options}
//                         </select>
//                         <button data-paper-id="${paper.id}" class="assign-tc-btn bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md">Assign</button>
//                     </div>
//                  `;
//             } else if (paper.status === 'Awaiting Decision') {
//                 actionHTML = `
//                     <div class="mt-4 flex items-center space-x-2">
//                         <button data-paper-id="${paper.id}" data-paper-title="${paper.title}" class="view-reviews-btn bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md">View Reviews</button>
//                         <button data-paper-id="${paper.id}" data-decision="Accepted" class="decision-btn bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md">Accept</button>
//                         <button data-paper-id="${paper.id}" data-decision="Rejected" class="decision-btn bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md">Reject</button>
//                     </div>
//                 `;
//             }
            
//             // Display assigned reviewers and their status
//             let reviewersHTML = '';
//             if (paper.reviewers && paper.reviewers.length > 0) {
//                 reviewersHTML = `
//                     <div class="mt-4 pt-2 border-t">
//                         <h5 class="font-semibold text-sm text-gray-700">Reviewer Status:</h5>
//                         <ul class="mt-1 space-y-1">
//                             ${paper.reviewers.map(r => `<li class="text-sm text-gray-600">${r.email} - ${getStatusBadge(r.status)}</li>`).join('')}
//                         </ul>
//                     </div>
//                 `;
//             }

//             paperEl.innerHTML = `
//                  <div class="flex justify-between items-start">
//                    <div>
//                         <h4 class="font-bold">${paper.title}</h4>
//                         <p class="text-sm text-gray-500">By: ${paper.authorEmail}</p>
//                         <p class="text-sm text-gray-600 mt-1">
//                             Assigned to: <span class="font-semibold">${paper.trackChairEmail || 'N/A'}</span>
//                         </p>
//                     </div>
//                     ${getStatusBadge(paper.status)}
//                 </div>
//                 <div class="mt-2">
//                     <button data-paper-link="${paper.paperLink}" class="view-paper-link-btn bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-1 px-3 rounded-md text-sm">View Paper</button>
//                 </div>
//                 ${actionHTML}
//                 ${reviewersHTML}
//             `;
//             ownerPapersList.appendChild(paperEl);
//         });
        
//         document.getElementById('owner-total-papers').textContent = total;
//         document.getElementById('owner-needs-assignment').textContent = needsAssignment;
//         document.getElementById('owner-under-review').textContent = underReview;
//         document.getElementById('owner-awaiting-decision').textContent = awaitingDecision;

//     });
//     unsubscribeListeners.push(unsubPapers);
// }

// // --- TRACK CHAIR VIEW LOGIC ---
// function initTrackChairView() {
//     const papersList = document.getElementById('track-chair-papers-list');
    
//     const q = query(collection(db, 'papers'), where('trackChairId', '==', currentUser.uid));
//     const unsub = onSnapshot(q, (snapshot) => {
//         papersList.innerHTML = '';
//         if(snapshot.empty){
//             papersList.innerHTML = '<p class="text-gray-500">You have not been assigned any papers yet.</p>';
//             return;
//         }
//         snapshot.forEach(doc => {
//             const paper = { id: doc.id, ...doc.data() };
//             const paperEl = document.createElement('div');
//             paperEl.className = 'p-4 border rounded-md bg-white shadow-sm';

//             let buttonHTML = '';
//              if (paper.status === 'Awaiting Assignment' || paper.status === 'Under Review' || paper.status === 'Awaiting Decision') {
//                 buttonHTML = `<button data-paper-id="${paper.id}" data-paper-title="${paper.title}" class="assign-rev-btn mt-4 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md">Manage Reviewers</button>`;
//             }

//             // Display assigned reviewers
//             let reviewersHTML = '<p class="text-sm text-gray-500">No reviewers assigned.</p>';
//             if (paper.reviewers && paper.reviewers.length > 0) {
//                 reviewersHTML = '<ul class="mt-1 space-y-1">' + paper.reviewers.map(r => `<li class="text-sm text-gray-700">${r.email} - ${getStatusBadge(r.status)}</li>`).join('') + '</ul>';
//             }

//             paperEl.innerHTML = `
//                 <div class="flex justify-between items-start">
//                    <div>
//                         <h4 class="font-bold">${paper.title}</h4>
//                         <p class="text-sm text-gray-500">By: ${paper.authorEmail}</p>
//                     </div>
//                     ${getStatusBadge(paper.status)}
//                 </div>
//                 <div class="mt-2">
//                     <button data-paper-link="${paper.paperLink}" class="view-paper-link-btn bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-1 px-3 rounded-md text-sm">View Paper</button>
//                 </div>
//                 <div class="mt-4">
//                     <h5 class="font-semibold text-sm">Assigned Reviewers:</h5>
//                     ${reviewersHTML}
//                 </div>
//                 ${buttonHTML}
//             `;
//             papersList.appendChild(paperEl);
//         });
//     });
//     unsubscribeListeners.push(unsub);
// }

// // --- REVIEWER VIEW LOGIC ---
// function initReviewerView() {
//     const papersList = document.getElementById('reviewer-papers-list');
    
//     const q = query(collection(db, 'assignments'), where('reviewerId', '==', currentUser.uid));
//     const unsub = onSnapshot(q, async (snapshot) => {
//         papersList.innerHTML = '';
//          if(snapshot.empty){
//             papersList.innerHTML = '<p class="text-gray-500">You have no review assignments.</p>';
//             return;
//         }
        
//         // Fetch paper details to get paper links
//         const paperIds = [...new Set(snapshot.docs.map(doc => doc.data().paperId))];
//         const papers = {};
//         if (paperIds.length > 0) {
//             const papersQuery = query(collection(db, 'papers'), where('__name__', 'in', paperIds));
//             const paperSnapshot = await getDocs(papersQuery);
//             paperSnapshot.forEach(doc => {
//                 papers[doc.id] = doc.data();
//             });
//         }
        
//         snapshot.forEach(doc => {
//             const assignment = {id: doc.id, ...doc.data()};
//             const paper = papers[assignment.paperId];
//             const paperLink = paper ? paper.paperLink : '';

//             const paperEl = document.createElement('div');
//             paperEl.className = 'p-4 border rounded-md bg-white shadow-sm';
            
//             let actionsHTML = '';
//             if(assignment.status === 'Pending') {
//                 actionsHTML = `
//                     <div class="mt-4 space-x-2">
//                         <button data-assignment-id="${assignment.id}" class="accept-review-btn bg-green-500 text-white px-3 py-1 rounded text-sm">Accept</button>
//                         <button data-assignment-id="${assignment.id}" class="decline-review-btn bg-red-500 text-white px-3 py-1 rounded text-sm">Decline</button>
//                     </div>
//                 `;
//             } else if (assignment.status === 'Accepted') {
//                 actionsHTML = `
//                      <div class="mt-4">
//                         <button data-assignment-id="${assignment.id}" data-paper-id="${assignment.paperId}" data-paper-title="${assignment.paperTitle}" class="submit-review-btn bg-indigo-500 text-white px-4 py-2 rounded">Submit Review</button>
//                     </div>
//                 `;
//             }
            
//              paperEl.innerHTML = `
//                 <div class="flex justify-between items-start">
//                    <div>
//                         <h4 class="font-bold">${assignment.paperTitle}</h4>
//                         <button data-paper-link="${paperLink}" class="view-paper-link-btn mt-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-1 px-3 rounded-md text-sm">View Paper</button>
//                     </div>
//                     ${getStatusBadge(assignment.status)}
//                 </div>
//                 ${actionsHTML}
//             `;
//             papersList.appendChild(paperEl);
//         });
//     });
//     unsubscribeListeners.push(unsub);
// }

// --- FIREBASE IMPORTS ---
// import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
// import {
//     getAuth,
//     createUserWithEmailAndPassword,
//     signInWithEmailAndPassword,
//     onAuthStateChanged,
//     signOut,
//     sendPasswordResetEmail // Import the new function
// } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// import {
//     getFirestore,
//     doc,
//     setDoc,
//     getDoc,
//     addDoc,
//     collection,
//     query,
//     where,
//     onSnapshot,
//     updateDoc,
//     serverTimestamp,
//     getDocs
// } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// // --- FIREBASE CONFIGURATION ---
// // Vite replaces these variables with the values from your .env.local file
// const firebaseConfig = {
//     apiKey: import.meta.env.VITE_API_KEY,
//     authDomain: import.meta.env.VITE_AUTH_DOMAIN,
//     projectId: import.meta.env.VITE_PROJECT_ID,
//     storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
//     messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
//     appId: import.meta.env.VITE_APP_ID
// };


// // --- INITIALIZE FIREBASE ---
// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);
// const db = getFirestore(app);

// // --- GLOBAL STATE ---
// let currentUser = null;
// let currentUserRole = null;
// let unsubscribeListeners = []; // To detach listeners on logout

// // --- UI ELEMENTS ---
// const views = document.querySelectorAll('.view');
// const authView = document.getElementById('auth-view');
// const loadingView = document.getElementById('loading-view');
// const logoutBtn = document.getElementById('logout-btn');
// const userEmailDisplay = document.getElementById('user-email-display');
// const userEmailDisplayBtn = document.getElementById('user-email-display-btn'); // Button wrapper for email
// const userRoleDisplay = document.getElementById('user-role-display');
// const roleNavigation = document.getElementById('role-navigation'); // New nav bar

// // Application-specific elements
// const submitPaperForm = document.getElementById('submit-paper-form');
// const addUserForm = document.getElementById('add-user-form');
// const ownerPapersList = document.getElementById('owner-papers-list');
// const trackChairPapersList = document.getElementById('track-chair-papers-list');
// const reviewerPapersList = document.getElementById('reviewer-papers-list');
// const authorPapersList = document.getElementById('author-papers-list');
// const exportCsvBtn = document.getElementById('export-csv-btn');


// // Modals and their controls
// const assignModal = document.getElementById('assign-reviewer-modal');
// const reviewerSelect = document.getElementById('reviewer-select');
// const reviewModal = document.getElementById('submit-review-modal');
// const submitReviewForm = document.getElementById('submit-review-form');
// const viewReviewsModal = document.getElementById('view-reviews-modal');

// // NEW Profile Modal Elements
// const profileModal = document.getElementById('profile-modal');
// const closeProfileModalBtn = document.getElementById('close-profile-modal-btn');
// const profileForm = document.getElementById('profile-form');
// const profileEmail = document.getElementById('profile-email');
// const profileRole = document.getElementById('profile-role');
// const expertiseSection = document.getElementById('expertise-section');
// const profileExpertise = document.getElementById('profile-expertise');
// const changePasswordBtn = document.getElementById('change-password-btn');


// // --- UTILITY FUNCTIONS ---
// const showView = (viewId) => {
//     views.forEach(view => {
//         view.classList.remove('active');
//     });
//     document.getElementById(viewId).classList.add('active');
// };

// const getStatusBadge = (status) => {
//      const colors = {
//         'Submitted': 'bg-blue-100 text-blue-800',
//         'Awaiting Assignment': 'bg-yellow-100 text-yellow-800',
//         'Under Review': 'bg-purple-100 text-purple-800',
//         'Awaiting Decision': 'bg-orange-100 text-orange-800',
//         'Accepted': 'bg-green-100 text-green-800',
//         'Rejected': 'bg-red-100 text-red-800',
//         'Pending': 'bg-gray-100 text-gray-800',
//         'Completed': 'bg-green-100 text-green-800',
//         'Declined': 'bg-red-100 text-red-800'
//     };
//     return `<span class="px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}">${status}</span>`;
// };

// // --- MOCK EMAIL FUNCTION ---
// const sendEmailNotification = (to, subject, body) => {
//     console.log("--- EMAIL SIMULATION ---");
//     console.log(`To: ${to}`);
//     console.log(`Subject: ${subject}`);
//     console.log(`Body: ${body}`);
//     console.log("------------------------");
// }

// // --- UTILITY FUNCTION ---
// // Checks all assignments for a paper and updates the paper's overall status
// // if all reviews are completed or declined.
// async function checkAndUpdatePaperStatus(paperId) {
//     const paperAssignmentsQuery = query(collection(db, 'assignments'), where('paperId', '==', paperId));
//     const assignmentSnapshot = await getDocs(paperAssignmentsQuery);
    
//     if (assignmentSnapshot.empty) {
//         return; // No assignments for this paper.
//     }
    
//     let allReviewsAreIn = true;
//     assignmentSnapshot.forEach(doc => {
//         const status = doc.data().status;
//         // If any review is still pending or accepted (but not completed), not all are in.
//         if (status === 'Pending' || status === 'Accepted') {
//             allReviewsAreIn = false;
//         }
//     });

//     if (allReviewsAreIn) {
//         const paperRef = doc(db, 'papers', paperId);
//         await updateDoc(paperRef, { status: 'Awaiting Decision' });
//         console.log(`All reviews for paper ${paperId} are accounted for. Status updated to 'Awaiting Decision'.`);
//     }
// }

// // --- AUTHENTICATION LOGIC ---
// const authForm = document.getElementById('auth-form');
// const emailInput = document.getElementById('email');
// const passwordInput = document.getElementById('password');
// const roleSelection = document.getElementById('role-selection');
// const roleSelect = document.getElementById('role');
// const loginBtn = document.getElementById('login-btn');
// const signupBtn = document.getElementById('signup-btn');
// const authError = document.getElementById('auth-error');

// signupBtn.addEventListener('click', async () => {
//     roleSelection.style.display = 'block';
//     authError.textContent = '';
//     const email = emailInput.value;
//     const password = passwordInput.value;

//     if (!email || !password) {
//         authError.textContent = 'Please enter email and password.';
//         return;
//     }
//     try {
//         // Step 1: Create the Auth user. This is the only part that can fail with 'email-already-in-use'.
//         const userCredential = await createUserWithEmailAndPassword(auth, email, password);
//         const user = userCredential.user;
//         const userDocRef = doc(db, "users", user.uid); // Define userDocRef here

//         // Step 2: Auth user was created. Now handle the Firestore document.
//         const usersRef = collection(db, "users");
//         // Look for an 'invited' doc for this email.
//         const q = query(usersRef, where("email", "==", email), where("status", "==", "invited"));
//         const querySnapshot = await getDocs(q);

//         let userRole = 'Author'; // Default role

//         if (!querySnapshot.empty) {
//             // Found an invitation. We'll update this doc to become the real user doc.
//             const invitedDoc = querySnapshot.docs[0];
//             userRole = invitedDoc.data().role;
//             await updateDoc(doc(db, "users", invitedDoc.id), {
//                 uid: user.uid,
//                 status: 'active'
//             });
//             // Also create the main user doc at /users/{uid}
//             await setDoc(userDocRef, {
//                 email: user.email,
//                 role: userRole,
//                 uid: user.uid,
//                 status: 'active',
//                 expertise: '' // Initialize expertise field
//             });

//         } else {
//             // No invitation found. This is a regular user signing up.
//             if (email === 'owner@conference.com') { userRole = 'Owner'; }
//             // We will create a new doc for them, using their UID as the doc ID.
//             await setDoc(userDocRef, {
//                 email: user.email,
//                 role: userRole,
//                 uid: user.uid,
//                 status: 'active',
//                 expertise: '' // Initialize expertise field
//             });
//         }

//         console.log("User signed up and profile created with role:", userRole);
//         roleSelection.style.display = 'none';

//     } catch (error) {
//         if (error.code === 'auth/email-already-in-use') {
//             authError.textContent = 'This email is already registered. Please use the Log In button.';
//         } else {
//             authError.textContent = error.message;
//         }
//     }
// });

// loginBtn.addEventListener('click', async () => {
//     authError.textContent = '';
//     roleSelection.style.display = 'none';
//     if (!emailInput.value || !passwordInput.value) {
//         authError.textContent = 'Please enter email and password.';
//         return;
//     }
//     try {
//         await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
//         console.log("User logged in.");
//     } catch (error) {
//         authError.textContent = error.message;
//     }
// });

// logoutBtn.addEventListener('click', async () => {
//     roleNavigation.innerHTML = ''; // Clear nav tabs on logout
//     await signOut(auth);
//     console.log("User logged out.");
// });

// // --- AUTH STATE OBSERVER ---
// // This block is the robust version from our previous discussion
// onAuthStateChanged(auth, async (user) => {
//     // Cleanup old listeners
//     unsubscribeListeners.forEach(unsub => unsub());
//     unsubscribeListeners = [];

//     if (user) {
//         currentUser = user;
        
//         // Fetch the user's document directly by their UID.
//         const userDocRef = doc(db, "users", user.uid);
//         const userDocSnap = await getDoc(userDocRef);

//         if (userDocSnap.exists()) {
//             // --- User document was found ---
//             const userData = userDocSnap.data();
//             currentUserRole = userData.role;
//             userEmailDisplay.textContent = user.email;
//             userRoleDisplay.textContent = `Role: ${currentUserRole}`;
//             logoutBtn.style.display = 'block';
//             setupUIForRole(currentUserRole);

//         } else {
//             // --- No user document found ---
//             // This is normal for a first-time signup.
//             // We will check if they were invited, or create a default (Author/Owner) doc.

//             const usersRef = collection(db, "users");
//             const q = query(usersRef, where("email", "==", user.email), where("status", "==", "invited"));
//             const querySnapshot = await getDocs(q);

//             if (!querySnapshot.empty) {
//                 // This is an invited user signing up. Let's update their 'invited' doc.
//                 const invitedDoc = querySnapshot.docs[0];
//                 await updateDoc(doc(db, "users", invitedDoc.id), {
//                     uid: user.uid,
//                     status: 'active'
//                 });
//                 // Now we also create their main user doc at /users/{uid}
//                 const newRole = invitedDoc.data().role;
//                 await setDoc(userDocRef, {
//                     email: user.email,
//                     role: newRole,
//                     uid: user.uid,
//                     status: 'active',
//                     expertise: '' // Initialize expertise field
//                 });
                
//                 currentUserRole = newRole;
//                 userEmailDisplay.textContent = user.email;
//                 userRoleDisplay.textContent = `Role: ${currentUserRole}`;
//                 logoutBtn.style.display = 'block';
//                 setupUIForRole(currentUserRole);

//             } else if (user.email === 'owner@conference.com') {
//                  // Special case: First time the owner signs up
//                 await setDoc(userDocRef, {
//                     email: user.email,
//                     role: 'Owner',
//                     uid: user.uid,
//                     status: 'active',
//                     expertise: '' // Initialize expertise field
//                 });
//                 currentUserRole = 'Owner';
//                 userEmailDisplay.textContent = user.email;
//                 userRoleDisplay.textContent = `Role: ${currentUserRole}`;
//                 logoutBtn.style.display = 'block';
//                 setupUIForRole(currentUserRole);
            
//             } else {
//                  // Standard new Author signup
//                  await setDoc(userDocRef, {
//                     email: user.email,
//                     role: 'Author',
//                     uid: user.uid,
//                     status: 'active',
//                     expertise: '' // Initialize expertise field
//                 });
//                 currentUserRole = 'Author';
//                 userEmailDisplay.textContent = user.email;
//                 userRoleDisplay.textContent = `Role: ${currentUserRole}`;
//                 logoutBtn.style.display = 'block';
//                 setupUIForRole(currentUserRole);
//             }
//         }
//     } else {
//         // User is logged out
//         currentUser = null;
//         currentUserRole = null;
//         userEmailDisplay.textContent = '';
//         userRoleDisplay.textContent = '';
//         logoutBtn.style.display = 'none';
//         roleNavigation.innerHTML = ''; // Clear nav tabs
//         showView('auth-view');
//     }
// });


// // --- ROLE-BASED NAVIGATION SETUP ---
// function setupRoleNavigation(role) {
//     roleNavigation.innerHTML = ''; // Clear old tabs
//     let navHTML = '';

//     const baseTabClass = "nav-tab inline-block py-2 px-4 font-semibold border-b-2 border-transparent hover:border-gray-300 hover:text-gray-700 cursor-pointer transition-colors duration-150";
//     const activeTabClass = "active"; // This class is added by the event listener

//     switch (role) {
//         case 'Owner':
//             navHTML = `
//                 <button class="${baseTabClass} ${activeTabClass}" data-target="owner-dashboard-section">Dashboard</button>
//                 <button class="${baseTabClass}" data-target="owner-papers-section">Paper Management</button>
//                 <button class="${baseTabClass}" data-target="owner-users-section">User Management</button>
//             `;
//             break;
//         case 'Author':
//             navHTML = `
//                 <button class="${baseTabClass} ${activeTabClass}" data-target="author-submissions-section">My Submissions</button>
//                 <button class="${baseTabClass}" data-target="author-submit-section">Submit New Paper</button>
//             `;
//             break;
//         case 'TrackChair':
//             navHTML = `
//                 <button class="${baseTabClass} ${activeTabClass}" data-target="trackchair-papers-section">My Assigned Papers</button>
//             `;
//             break;
//         case 'Reviewer':
//             navHTML = `
//                 <button class="${baseTabClass} ${activeTabClass}" data-target="reviewer-papers-section">My Review Assignments</button>
//             `;
//             break;
//     }
//     roleNavigation.innerHTML = navHTML;

//     // Reset sections to default (first one active)
//     const view = document.getElementById(`${role.toLowerCase()}-view`);
//     if (view) {
//         view.querySelectorAll('.role-section').forEach((section, index) => {
//             if (index === 0) {
//                 section.classList.remove('hidden');
//             } else {
//                 section.classList.add('hidden');
//             }
//         });
//     }
// }

// // --- NAVIGATION TAB CLICK HANDLER ---
// roleNavigation.addEventListener('click', (e) => {
//     if (e.target.classList.contains('nav-tab')) {
//         const targetId = e.target.dataset.target;
//         if (!targetId || !currentUserRole) return; // Safety checks

//         // Get the main view for the current user (e.g., 'owner-view')
//         const parentViewId = `${currentUserRole.toLowerCase()}-view`;
//         const parentView = document.getElementById(parentViewId);
//         if (!parentView) return;
        
//         // Hide all sections within that parent view
//         parentView.querySelectorAll('.role-section').forEach(section => {
//             section.classList.add('hidden');
//         });
        
//         // Show the target section
//         const targetSection = document.getElementById(targetId);
//         if(targetSection) {
//             targetSection.classList.remove('hidden');
//         }
        
//         // Update active tab style (only within the nav bar)
//         roleNavigation.querySelectorAll('.nav-tab').forEach(tab => {
//             tab.classList.remove('active');
//         });
//         e.target.classList.add('active');
//     }
// });

// // --- ROLE-BASED UI SETUP ---
// const setupUIForRole = (role) => {
//     showView('loading-view');
//     setupRoleNavigation(role); // Setup the navigation tabs
    
//     // Delay to show loading and allow data to fetch
//     setTimeout(() => {
//         switch (role) {
//             case 'Author':
//                 showView('author-view');
//                 initAuthorView();
//                 break;
//             case 'Owner':
//                 showView('owner-view');
//                 initOwnerView();
//                 break;
//             case 'TrackChair':
//                 showView('track-chair-view');
//                 initTrackChairView();
//                 break;
//             case 'Reviewer':
//                 showView('reviewer-view');
//                 initReviewerView();
//                 break;
//             default:
//                 showView('auth-view');
//                 break;
//         }
//     }, 500); // Reduced delay for faster feel
// };
        
// // --- APPLICATION EVENT LISTENERS (ATTACHED ONCE) ---

// // Author: Submit Paper
// submitPaperForm.addEventListener('submit', async (e) => {
//     e.preventDefault();
//     const title = document.getElementById('paper-title').value;
//     const abstract = document.getElementById('paper-abstract').value;
//     const keywords = document.getElementById('paper-keywords').value;
//     const paperLink = document.getElementById('paper-link').value;

//     try {
//         await addDoc(collection(db, 'papers'), {
//             title,
//             abstract,
//             keywords: keywords.split(',').map(k => k.trim()),
//             paperLink,
//             authorId: currentUser.uid,
//             authorEmail: currentUser.email,
//             status: 'Submitted',
//             submittedAt: serverTimestamp(),
//         });
//         submitPaperForm.reset();
//         alert('Paper submitted successfully!');
//         // Switch back to "My Submissions" tab
//         document.querySelector('.nav-tab[data-target="author-submissions-section"]').click();
//     } catch(error) {
//         console.error("Error submitting paper: ", error);
//         alert('Failed to submit paper.');
//     }
// });

// // Owner: Add new user (TrackChair or Reviewer)
// addUserForm.addEventListener('submit', async (e) => {
//     e.preventDefault();
//     const email = document.getElementById('new-user-email').value;
//     const role = document.getElementById('new-user-role').value;
    
//     if (!email) {
//         alert("Please enter an email.");
//         return;
//     }

//     try {
//         const usersRef = collection(db, "users");
//         const q = query(usersRef, where("email", "==", email));
//         const querySnapshot = await getDocs(q);
//         let alertMessage = '';

//         if (!querySnapshot.empty) {
//             // A document for this email already exists. Update its role.
//             const userDoc = querySnapshot.docs[0];
//             await updateDoc(doc(db, "users", userDoc.id), { role: role });
//             alertMessage = `Updated role for existing user ${email} to ${role}. They can now log in to see their new dashboard.`;
//         } else {
//             // No document for this email exists. Create an 'invitation' document.
//             await addDoc(collection(db, "users"), {
//                 email: email,
//                 role: role,
//                 uid: null, // UID will be added when the user signs up
//                 status: 'invited'
//             });
//             alertMessage = `Invitation sent to ${email} as a ${role}. They can now sign up on the main page.`;
//         }
        
//         sendEmailNotification(
//             email, 
//             "Your Conference Tool Role Has Been Set",
//             `Hello, \nYour role for the conference has been set to ${role}. Please log in or sign up to continue.`
//         );
//         alert(alertMessage);
//         addUserForm.reset();
//     } catch(error) {
//         console.error("Error managing user role:", error);
//         alert("Failed to manage user role.");
//     }
// });

// // Owner: Event Delegation for paper list actions
// ownerPapersList.addEventListener('click', async (e) => {
//     // Assign Track Chair
//     if (e.target.classList.contains('assign-tc-btn')) {
//         const paperId = e.target.dataset.paperId;
//         const selectEl = document.querySelector(`.assign-tc-select[data-paper-id='${paperId}']`);
//         const selectedValue = selectEl.value;
//         if (!selectedValue) {
//             alert("Please select a Track Chair.");
//             return;
//         }
        
//         const [trackChairId, trackChairEmail] = selectedValue.split('|');

//         try {
//             const paperRef = doc(db, 'papers', paperId);
//             await updateDoc(paperRef, { trackChairId, trackChairEmail, status: 'Awaiting Assignment' });
            
//             const paperDoc = await getDoc(paperRef);
//             const paperData = paperDoc.data();
            
//             sendEmailNotification(
//                 trackChairEmail,
//                 "New Paper Assignment",
//                 `Hello ${trackChairEmail},\n\nYou have been assigned a new paper titled "${paperData.title}" to manage.\nPlease log in to assign reviewers.`
//             );
            
//             alert("Paper assigned successfully.");
//         } catch (error) {
//             console.error("Error assigning paper:", error);
//             alert("Failed to assign paper.");
//         }
//     }

//     // View Reviews
//     if (e.target.classList.contains('view-reviews-btn')) {
//         const paperId = e.target.dataset.paperId;
//         const paperTitle = e.target.dataset.paperTitle;
//         document.getElementById('reviews-modal-paper-title').textContent = paperTitle;
//         const contentDiv = document.getElementById('reviews-modal-content');
//         contentDiv.innerHTML = '<p>Loading reviews...</p>';
//         viewReviewsModal.style.display = 'block';

//         const reviewsQuery = query(collection(db, 'reviews'), where('paperId', '==', paperId));
//         const reviewSnapshot = await getDocs(reviewsQuery);
        
//         if (reviewSnapshot.empty) {
//             contentDiv.innerHTML = '<p>No reviews have been submitted for this paper yet.</p>';
//             return;
//         }

//         contentDiv.innerHTML = '';
//         let reviewCounter = 1;
//         reviewSnapshot.forEach(reviewDoc => {
//             const review = reviewDoc.data();
//             const reviewEl = document.createElement('div');
//             reviewEl.className = 'p-3 border rounded-md bg-white';
//             reviewEl.innerHTML = `
//                 <h5 class="font-bold text-md">Review ${reviewCounter++}</h5>
//                 <p class="text-sm font-semibold mt-2">Recommendation: <span class="font-normal">${review.recommendation}</span></p>
//                 <p class="text-sm font-semibold mt-2">Comments for Author:</p>
//                 <p class="text-sm p-2 bg-gray-100 rounded">${review.commentsForAuthor}</p>
//                 <p class="text-sm font-semibold mt-2">Confidential Comments for Chair:</p>
//                 <p class="text-sm p-2 bg-gray-100 rounded">${review.commentsForChair || 'None'}</p>
//             `;
//             contentDiv.appendChild(reviewEl);
//         });
//     }

//     // Make Final Decision
//     if (e.target.classList.contains('decision-btn')) {
//         const paperId = e.target.dataset.paperId;
//         const decision = e.target.dataset.decision; // 'Accepted' or 'Rejected'

//         if (confirm(`Are you sure you want to ${decision.toLowerCase()} this paper?`)) {
//             try {
//                 const paperRef = doc(db, 'papers', paperId);
//                 await updateDoc(paperRef, { status: decision });

//                 const paperDoc = await getDoc(paperRef);
//                 const paperData = paperDoc.data();
                
//                 sendEmailNotification(
//                     paperData.authorEmail,
//                     `Decision on your paper: "${paperData.title}"`,
//                     `Dear Author,\n\nA decision has been made on your paper, "${paperData.title}". The final decision is: ${decision}.\nPlease log in to view feedback.`
//                 );

//                 alert(`Paper has been ${decision.toLowerCase()}.`);
//             } catch (error) {
//                 console.error('Error making decision:', error);
//                 alert('Failed to make a decision.');
//             }
//         }
//     }

//     // View Paper Link
//     if (e.target.classList.contains('view-paper-link-btn')) {
//         const paperLink = e.target.dataset.paperLink;
//         if (paperLink) {
//             window.open(paperLink, '_blank');
//         } else {
//             alert("No paper link was provided for this submission.");
//         }
//     }
// });

// // Track Chair: Event Delegation for paper list actions
// trackChairPapersList.addEventListener('click', async (e) => {
//     // Open "Assign Reviewer" modal
//     if(e.target.classList.contains('assign-rev-btn')) {
//         const paperId = e.target.dataset.paperId;
//         const paperTitle = e.target.dataset.paperTitle;
        
//         document.getElementById('modal-paper-id').value = paperId;
//         document.getElementById('modal-paper-title').textContent = `Paper: ${paperTitle}`;
        
//         // Populate reviewers and SHOW EXPERTISE
//         const revQuery = query(collection(db, "users"), where("role", "==", "Reviewer"), where("status", "==", "active"));
//         const revSnapshot = await getDocs(revQuery);
//         reviewerSelect.innerHTML = '';
//         revSnapshot.forEach(doc => {
//             const reviewer = doc.data();
//             if(reviewer.uid){ // Ensure reviewer has signed up
//                 // --- NEW --- Add expertise to the option text
//                 const expertise = reviewer.expertise ? ` (${reviewer.expertise})` : '';
//                 const option = new Option(`${reviewer.email}${expertise}`, `${reviewer.uid}|${reviewer.email}`);
//                 reviewerSelect.add(option);
//             }
//         });
        
//         assignModal.style.display = 'block';
//     }

//     // View Paper Link
//     if (e.target.classList.contains('view-paper-link-btn')) {
//         const paperLink = e.target.dataset.paperLink;
//         if (paperLink) {
//             window.open(paperLink, '_blank');
//         } else {
//             alert("No paper link was provided for this submission.");
//         }
//     }
// });

// // Track Chair: Assign Reviewer Modal buttons
// document.getElementById('cancel-assign-btn').addEventListener('click', () => {
//     assignModal.style.display = 'none';
// });

// document.getElementById('confirm-assign-btn').addEventListener('click', async () => {
//     const paperId = document.getElementById('modal-paper-id').value;
//     const selectedOptions = Array.from(reviewerSelect.selectedOptions);
//     if (selectedOptions.length === 0) {
//         alert('Please select at least one reviewer.');
//         return;
//     }

//     const paperRef = doc(db, 'papers', paperId);
//     const paperDoc = await getDoc(paperRef);
//     const paperData = paperDoc.data();

//     const assignments = selectedOptions.map(opt => {
//          const [reviewerId, reviewerEmail] = opt.value.split('|');
//          return {
//              paperId,
//              paperTitle: paperData.title,
//              reviewerId,
//              reviewerEmail,
//              trackChairId: currentUser.uid,
//              status: 'Pending',
//              assignedAt: serverTimestamp()
//          };
//     });
    
//     // Create assignment docs and update paper status
//     const batchPromises = assignments.map(async (assignment) => {
//         await addDoc(collection(db, 'assignments'), assignment);
//         sendEmailNotification(
//             assignment.reviewerEmail, 
//             "You have a new review request",
//             `Hello ${assignment.reviewerEmail},\n\nYou have been requested to review the paper "${assignment.paperTitle}". Please log in to accept or decline.`
//         );
//     });
    
//     await Promise.all(batchPromises);
    
//     // Update paper with reviewer info for display
//     const reviewerInfoForPaper = assignments.map(a => ({uid: a.reviewerId, email: a.reviewerEmail, status: 'Pending'}));
//     await updateDoc(paperRef, {
//         status: 'Under Review',
//         reviewers: reviewerInfoForPaper
//     });
    
//     assignModal.style.display = 'none';
//     alert('Reviewers assigned successfully.');
// });

// // Reviewer: Accept/Decline/Submit buttons (event delegation)
// reviewerPapersList.addEventListener('click', async (e) => {
//     // Handle view paper link button
//     if (e.target.classList.contains('view-paper-link-btn')) {
//         const paperLink = e.target.dataset.paperLink;
//         if (paperLink) {
//             window.open(paperLink, '_blank');
//         } else {
//             alert("No paper link was provided for this submission.");
//         }
//         return;
//     }

//     const assignmentId = e.target.dataset.assignmentId;
//     if (!assignmentId) return;

//     const assignmentRef = doc(db, 'assignments', assignmentId);
//     const assignmentDoc = await getDoc(assignmentRef);
//     const assignmentData = assignmentDoc.data();
//     const paperRef = doc(db, 'papers', assignmentData.paperId);

//     async function updatePaperReviewerStatus(newStatus) {
//         const paperDoc = await getDoc(paperRef);
//         const paperData = paperDoc.data();
//         if (paperData.reviewers && Array.isArray(paperData.reviewers)) {
//             const updatedReviewers = paperData.reviewers.map(r => {
//                 if (r.uid === currentUser.uid) {
//                     return { ...r, status: newStatus };
//                 }
//                 return r;
//             });
//             await updateDoc(paperRef, { reviewers: updatedReviewers });
//         }
//     }
    
//     if(e.target.classList.contains('accept-review-btn')) {
//         await updateDoc(assignmentRef, { status: 'Accepted' });
//         await updatePaperReviewerStatus('Accepted');
//         alert('Review accepted.');
//     }
    
//     if(e.target.classList.contains('decline-review-btn')) {
//         await updateDoc(assignmentRef, { status: 'Declined' });
//         await updatePaperReviewerStatus('Declined');
//         await checkAndUpdatePaperStatus(assignmentData.paperId); // Check status on decline
//         alert('Review declined.');
//     }
    
//     if(e.target.classList.contains('submit-review-btn')) {
//         const paperId = e.target.dataset.paperId;
//         const paperTitle = e.target.dataset.paperTitle;
        
//         document.getElementById('review-modal-paper-id').value = paperId;
//         document.getElementById('review-modal-assignment-id').value = assignmentId;
//         document.getElementById('review-modal-paper-title').textContent = `Paper: ${paperTitle}`;
//         reviewModal.style.display = 'block';
//     }
// });

// // Reviewer: Submit Review Modal buttons
// document.getElementById('cancel-review-btn').addEventListener('click', () => {
//     reviewModal.style.display = 'none';
// });

// submitReviewForm.addEventListener('submit', async (e) => {
//     e.preventDefault();
//     const paperId = document.getElementById('review-modal-paper-id').value;
//     const assignmentId = document.getElementById('review-modal-assignment-id').value;
    
//     const reviewData = {
//         paperId: paperId,
//         reviewerId: currentUser.uid,
//         assignmentId: assignmentId,
//         recommendation: document.getElementById('review-recommendation').value,
//         commentsForAuthor: document.getElementById('review-comments-author').value,
//         commentsForChair: document.getElementById('review-comments-confidential').value,
//         submittedAt: serverTimestamp()
//     };

//     try {
//         // Add review to a new collection
//         await addDoc(collection(db, 'reviews'), reviewData);
        
//         // Update assignment status
//         const assignmentRef = doc(db, 'assignments', assignmentId);
//         await updateDoc(assignmentRef, { status: 'Completed' });

//         // Update reviewer status on the paper itself
//         const paperRef = doc(db, 'papers', paperId);
//         const paperDoc = await getDoc(paperRef);
//         const paperData = paperDoc.data();
//         if (paperData.reviewers && Array.isArray(paperData.reviewers)) {
//             const updatedReviewers = paperData.reviewers.map(r => {
//                 if (r.uid === currentUser.uid) {
//                     return { ...r, status: 'Completed' };
//                 }
//                 return r;
//             });
//             await updateDoc(paperRef, { reviewers: updatedReviewers });
//         }
        
//         reviewModal.style.display = 'none';
//         document.getElementById('submit-review-form').reset();
//         alert("Review submitted successfully!");

//         // Check if all reviews for this paper are done
//         await checkAndUpdatePaperStatus(paperId);

//     } catch(error) {
//         console.error("Error submitting review: ", error);
//         alert("Failed to submit review.");
//     }
// });

// // Close View Reviews Modal
// document.getElementById('close-reviews-modal-btn').addEventListener('click', () => {
//     viewReviewsModal.style.display = 'none';
// });

// // --- NEW: PROFILE MODAL LISTENERS ---

// // Open Modal
// userEmailDisplayBtn.addEventListener('click', async () => {
//     if (!currentUser) return;

//     // 1. Populate static info
//     profileEmail.value = currentUser.email;
//     profileRole.value = currentUserRole;
    
//     // 2. Clear and hide expertise section by default
//     profileExpertise.value = '';
//     expertiseSection.style.display = 'none';

//     // 3. If Reviewer, fetch and show expertise
//     if (currentUserRole === 'Reviewer') {
//         const userDocRef = doc(db, "users", currentUser.uid);
//         const userDocSnap = await getDoc(userDocRef);
//         if (userDocSnap.exists()) {
//             const userData = userDocSnap.data();
//             profileExpertise.value = userData.expertise || '';
//         }
//         expertiseSection.style.display = 'block';
//     }

//     // 4. Show the modal
//     profileModal.style.display = 'block';
// });

// // Close Modal
// closeProfileModalBtn.addEventListener('click', () => {
//     profileModal.style.display = 'none';
// });

// // Save Profile Form
// profileForm.addEventListener('submit', async (e) => {
//     e.preventDefault();
    
//     // Only Reviewers have something to save
//     if (currentUserRole === 'Reviewer') {
//         const newExpertise = profileExpertise.value;
//         const userDocRef = doc(db, "users", currentUser.uid);
//         try {
//             await updateDoc(userDocRef, {
//                 expertise: newExpertise
//             });
//             alert("Profile updated successfully!");
//         } catch (error) {
//             console.error("Error updating profile:", error);
//             alert("Failed to update profile.");
//         }
//     }
//     profileModal.style.display = 'none';
// });

// // Change Password Button
// changePasswordBtn.addEventListener('click', async () => {
//     if (!currentUser) return;

//     if (confirm("This will send a password reset link to your email. Are you sure?")) {
//         try {
//             await sendPasswordResetEmail(auth, currentUser.email);
//             alert("Password reset email sent! Please check your inbox.");
//             profileModal.style.display = 'none';
//         } catch (error) {
//             console.error("Error sending password reset email:", error);
//             alert("Failed to send reset email. Please try again later.");
//         }
//     }
// });


// // Author: View Decision & Feedback
// authorPapersList.addEventListener('click', async (e) => {
//     if (e.target.classList.contains('view-decision-btn')) {
//         const paperId = e.target.dataset.paperId;
//         const paperTitle = e.target.dataset.paperTitle;
//         document.getElementById('reviews-modal-paper-title').textContent = paperTitle;
//         const contentDiv = document.getElementById('reviews-modal-content');
//         contentDiv.innerHTML = '<p>Loading feedback...</p>';
//         viewReviewsModal.style.display = 'block';

//         const reviewsQuery = query(collection(db, 'reviews'), where('paperId', '==', paperId));
//         const reviewSnapshot = await getDocs(reviewsQuery);
        
//         if (reviewSnapshot.empty) {
//             contentDiv.innerHTML = '<p>No feedback is available for this paper yet.</p>';
//             return;
//         }

//         contentDiv.innerHTML = '';
//         let reviewCounter = 1;
//         reviewSnapshot.forEach(reviewDoc => {
//             const review = reviewDoc.data();
//             const reviewEl = document.createElement('div');
//             reviewEl.className = 'p-3 border rounded-md bg-white';
//             reviewEl.innerHTML = `
//                 <h5 class="font-bold text-md">Feedback from Reviewer ${reviewCounter++}</h5>
//                 <p class="text-sm p-2 bg-gray-100 rounded mt-2">${review.commentsForAuthor}</p>
//             `;
//             contentDiv.appendChild(reviewEl);
//         });
//     }
// });

// // Owner: Export to CSV
// exportCsvBtn.addEventListener('click', async () => {
//     const papersQuery = query(collection(db, "papers"));
//     const snapshot = await getDocs(papersQuery);
//     if (snapshot.empty) {
//         alert("No papers to export.");
//         return;
//     }

//     let csvContent = "data:text/csv;charset=utf-8,";
//     // Define headers
//     const headers = [
//         "Paper Title",
//         "Author Email",
//         "Status",
//         "Submission Date",
//         "Paper Link",
//         "Assigned Track Chair",
//         "Assigned Reviewers"
//     ];
//     csvContent += headers.join(",") + "\r\n";

//     snapshot.forEach(doc => {
//         const paper = doc.data();
//         const reviewers = (paper.reviewers || []).map(r => r.email).join("; "); // Use semicolon to avoid comma issues
//         const submissionDate = paper.submittedAt ? new Date(paper.submittedAt.seconds * 1000).toLocaleDateString() : "N/A";
        
//         // Escape commas and quotes in title
//         const escapeCsv = (str) => `"${(str || '').replace(/"/g, '""')}"`;

//         const row = [
//             escapeCsv(paper.title),
//             escapeCsv(paper.authorEmail),
//             escapeCsv(paper.status),
//             submissionDate,
//             escapeCsv(paper.paperLink),
//             escapeCsv(paper.trackChairEmail),
//             escapeCsv(reviewers)
//         ];
//         csvContent += row.join(",") + "\r\n";
//     });

//     // Create and trigger download
//     const encodedUri = encodeURI(csvContent);
//     const link = document.createElement("a");
//     link.setAttribute("href", encodedUri);
//     link.setAttribute("download", "conference_papers_export.csv");
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
// });


// // --- AUTHOR VIEW LOGIC ---
// function initAuthorView() {
//     // Listen for this author's papers
//     const q = query(collection(db, 'papers'), where('authorId', '==', currentUser.uid));
//     const unsubscribe = onSnapshot(q, (querySnapshot) => {
//         authorPapersList.innerHTML = '';
//         if(querySnapshot.empty){
//             authorPapersList.innerHTML = '<p class="text-gray-500">You have not submitted any papers yet.</p>';
//             return;
//         }
//         querySnapshot.forEach(doc => {
//             const paper = { id: doc.id, ...doc.data()};
//             const paperEl = document.createElement('div');
//             paperEl.className = 'p-4 border rounded-md bg-gray-50';
            
//             let decisionHTML = '';
//             if (paper.status === 'Accepted' || paper.status === 'Rejected') {
//                 decisionHTML = `<button data-paper-id="${paper.id}" data-paper-title="${paper.title}" class="view-decision-btn mt-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-1 px-3 rounded-md text-sm">View Decision & Feedback</button>`;
//             }

//             paperEl.innerHTML = `
//                 <div class="flex justify-between items-start">
//                    <div>
//                         <h4 class="font-bold">${paper.title}</h4>
//                         <p class="text-sm text-gray-600">${paper.abstract.substring(0, 100)}...</p>
//                         ${decisionHTML}
//                     </div>
//                     ${getStatusBadge(paper.status)}
//                 </div>
//             `;
//             authorPapersList.appendChild(paperEl);
//         });
//     });
//     unsubscribeListeners.push(unsubscribe);
// }

// // --- OWNER VIEW LOGIC ---
// function initOwnerView() {
//     const trackChairsList = document.getElementById('track-chairs-list');
//     const reviewersList = document.getElementById('reviewers-list');
    
//     // Listen for users and populate lists
//     const usersQuery = query(collection(db, 'users'));
//     const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
//         trackChairsList.innerHTML = '';
//         reviewersList.innerHTML = '';
//         snapshot.forEach(doc => {
//             const user = doc.data();
//             const li = document.createElement('li');
//             li.textContent = user.email;
//             if(user.role === 'TrackChair') {
//                 trackChairsList.appendChild(li);
//             } else if (user.role === 'Reviewer') {
//                 reviewersList.appendChild(li);
//             }
//         });
//     });
//     unsubscribeListeners.push(unsubUsers);

//     // Listen for all papers
//     const papersQuery = query(collection(db, 'papers'));
//     const unsubPapers = onSnapshot(papersQuery, async (snapshot) => {
//         ownerPapersList.innerHTML = '';
//         let total = 0, needsAssignment = 0, underReview = 0, awaitingDecision = 0;
        
//         const trackChairs = [];
//         const tcQuery = query(collection(db, "users"), where("role", "==", "TrackChair"), where("status", "==", "active"));
//         const tcSnapshot = await getDocs(tcQuery);
//         tcSnapshot.forEach(doc => trackChairs.push({ id: doc.id, ...doc.data() }));

//         snapshot.forEach(doc => {
//             total++;
//             const paper = { id: doc.id, ...doc.data() };
            
//             if(paper.status === 'Submitted') needsAssignment++;
//             if(paper.status === 'Under Review') underReview++;
//             if(paper.status === 'Awaiting Decision') awaitingDecision++;

//             const paperEl = document.createElement('div');
//             paperEl.className = 'p-4 border rounded-md bg-gray-50';
//             let actionHTML = '';
//             if (paper.status === 'Submitted') {
//                  const options = trackChairs.map(tc => `<option value="${tc.uid}|${tc.email}">${tc.email}</option>`).join('');
//                  actionHTML = `
//                     <div class="mt-4 flex items-center space-x-2">
//                         <select data-paper-id="${paper.id}" class="assign-tc-select w-full p-2 border rounded-md">
//                             <option value="">Assign to Track Chair...</option>
//                             ${options}
//                         </select>
//                         <button data-paper-id="${paper.id}" class="assign-tc-btn bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md">Assign</button>
//                     </div>
//                  `;
//             } else if (paper.status === 'Awaiting Decision') {
//                 actionHTML = `
//                     <div class="mt-4 flex items-center space-x-2">
//                         <button data-paper-id="${paper.id}" data-paper-title="${paper.title}" class="view-reviews-btn bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md">View Reviews</button>
//                         <button data-paper-id="${paper.id}" data-decision="Accepted" class="decision-btn bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md">Accept</button>
//                         <button data-paper-id="${paper.id}" data-decision="Rejected" class="decision-btn bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md">Reject</button>
//                     </div>
//                 `;
//             }
            
//             // Display assigned reviewers and their status
//             let reviewersHTML = '';
//             if (paper.reviewers && paper.reviewers.length > 0) {
//                 reviewersHTML = `
//                     <div class="mt-4 pt-2 border-t">
//                         <h5 class="font-semibold text-sm text-gray-700">Reviewer Status:</h5>
//                         <ul class="mt-1 space-y-1">
//                             ${paper.reviewers.map(r => `<li class="text-sm text-gray-600">${r.email} - ${getStatusBadge(r.status)}</li>`).join('')}
//                         </ul>
//                     </div>
//                 `;
//             }

//             paperEl.innerHTML = `
//                  <div class="flex justify-between items-start">
//                    <div>
//                         <h4 class="font-bold">${paper.title}</h4>
//                         <p class="text-sm text-gray-500">By: ${paper.authorEmail}</p>
//                         <p class="text-sm text-gray-600 mt-1">
//                             Assigned to: <span class="font-semibold">${paper.trackChairEmail || 'N/A'}</span>
//                         </p>
//                     </div>
//                     ${getStatusBadge(paper.status)}
//                 </div>
//                 <div class="mt-2">
//                     <button data-paper-link="${paper.paperLink}" class="view-paper-link-btn bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-1 px-3 rounded-md text-sm">View Paper</button>
//                 </div>
//                 ${actionHTML}
//                 ${reviewersHTML}
//             `;
//             ownerPapersList.appendChild(paperEl);
//         });
        
//         document.getElementById('owner-total-papers').textContent = total;
//         document.getElementById('owner-needs-assignment').textContent = needsAssignment;
//         document.getElementById('owner-under-review').textContent = underReview;
//         document.getElementById('owner-awaiting-decision').textContent = awaitingDecision;

//     });
//     unsubscribeListeners.push(unsubPapers);
// }

// // --- TRACK CHAIR VIEW LOGIC ---
// function initTrackChairView() {
//     const papersList = document.getElementById('track-chair-papers-list');
    
//     const q = query(collection(db, 'papers'), where('trackChairId', '==', currentUser.uid));
//     const unsub = onSnapshot(q, (snapshot) => {
//         papersList.innerHTML = '';
//         if(snapshot.empty){
//             papersList.innerHTML = '<p class="text-gray-500">You have not been assigned any papers yet.</p>';
//             return;
//         }
//         snapshot.forEach(doc => {
//             const paper = { id: doc.id, ...doc.data() };
//             const paperEl = document.createElement('div');
//             paperEl.className = 'p-4 border rounded-md bg-white shadow-sm';

//             let buttonHTML = '';
//              if (paper.status === 'Awaiting Assignment' || paper.status === 'Under Review' || paper.status === 'Awaiting Decision') {
//                 buttonHTML = `<button data-paper-id="${paper.id}" data-paper-title="${paper.title}" class="assign-rev-btn mt-4 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md">Manage Reviewers</button>`;
//             }

//             // Display assigned reviewers
//             let reviewersHTML = '<p class="text-sm text-gray-500">No reviewers assigned.</p>';
//             if (paper.reviewers && paper.reviewers.length > 0) {
//                 reviewersHTML = '<ul class="mt-1 space-y-1">' + paper.reviewers.map(r => `<li class="text-sm text-gray-700">${r.email} - ${getStatusBadge(r.status)}</li>`).join('') + '</ul>';
//             }

//             paperEl.innerHTML = `
//                 <div class="flex justify-between items-start">
//                    <div>
//                         <h4 class="font-bold">${paper.title}</h4>
//                         <p class="text-sm text-gray-500">By: ${paper.authorEmail}</p>
//                     </div>
//                     ${getStatusBadge(paper.status)}
//                 </div>
//                 <div class="mt-2">
//                     <button data-paper-link="${paper.paperLink}" class="view-paper-link-btn bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-1 px-3 rounded-md text-sm">View Paper</button>
//                 </div>
//                 <div class="mt-4">
//                     <h5 class="font-semibold text-sm">Assigned Reviewers:</h5>
//                     ${reviewersHTML}
//                 </div>
//                 ${buttonHTML}
//             `;
//             papersList.appendChild(paperEl);
//         });
//     });
//     unsubscribeListeners.push(unsub);
// }

// // --- REVIEWER VIEW LOGIC ---
// function initReviewerView() {
//     const papersList = document.getElementById('reviewer-papers-list');
    
//     const q = query(collection(db, 'assignments'), where('reviewerId', '==', currentUser.uid));
//     const unsub = onSnapshot(q, async (snapshot) => {
//         papersList.innerHTML = '';
//          if(snapshot.empty){
//             papersList.innerHTML = '<p class="text-gray-500">You have no review assignments.</p>';
//             return;
//         }
        
//         // Fetch paper details to get paper links
//         const paperIds = [...new Set(snapshot.docs.map(doc => doc.data().paperId))];
//         const papers = {};
//         if (paperIds.length > 0) {
//             // Firestore 'in' queries are limited to 30 items. For a real app,
//             // we might fetch papers one by one if this limit is a concern.
//             const papersQuery = query(collection(db, 'papers'), where('__name__', 'in', paperIds));
//             const paperSnapshot = await getDocs(papersQuery);
//             paperSnapshot.forEach(doc => {
//                 papers[doc.id] = doc.data();
//             });
//         }
        
//         snapshot.forEach(doc => {
//             const assignment = {id: doc.id, ...doc.data()};
//             const paper = papers[assignment.paperId];
//             const paperLink = paper ? paper.paperLink : '';

//             const paperEl = document.createElement('div');
//             paperEl.className = 'p-4 border rounded-md bg-white shadow-sm';
            
//             let actionsHTML = '';
//             if(assignment.status === 'Pending') {
//                 actionsHTML = `
//                     <div class="mt-4 space-x-2">
//                         <button data-assignment-id="${assignment.id}" class="accept-review-btn bg-green-500 text-white px-3 py-1 rounded text-sm">Accept</button>
//                         <button data-assignment-id="${assignment.id}" class="decline-review-btn bg-red-500 text-white px-3 py-1 rounded text-sm">Decline</button>
//                     </div>
//                 `;
//             } else if (assignment.status === 'Accepted') {
//                 actionsHTML = `
//                      <div class="mt-4">
//                         <button data-assignment-id="${assignment.id}" data-paper-id="${assignment.paperId}" data-paper-title="${assignment.paperTitle}" class="submit-review-btn bg-indigo-500 text-white px-4 py-2 rounded">Submit Review</button>
//                     </div>
//                 `;
//             }
            
//              paperEl.innerHTML = `
//                 <div class="flex justify-between items-start">
//                    <div>
//                         <h4 class="font-bold">${assignment.paperTitle}</h4>
//                         <button data-paper-link="${paperLink}" class="view-paper-link-btn mt-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-1 px-3 rounded-md text-sm">View Paper</button>
//                     </div>
//                     ${getStatusBadge(assignment.status)}
//                 </div>
//                 ${actionsHTML}
//             `;
//             papersList.appendChild(paperEl);
//         });
//     });
//     unsubscribeListeners.push(unsub);
// }




// ============================================================================
// CONFERENCE MANAGEMENT TOOL - main.js
// Chunk 1/8: Imports, Configuration, and Global State
// ============================================================================









// --- FIREBASE IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    addDoc,
    collection,
    query,
    where,
    onSnapshot,
    updateDoc,
    serverTimestamp,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import emailjs from '@emailjs/browser';

// --- FIREBASE CONFIGURATION ---
// Vite replaces these variables with the values from your .env.local file
const firebaseConfig = {
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID
};

// --- EMAILJS CONFIGURATION ---
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const EMAILJS_TEMPLATE_ID_CONFIRM = import.meta.env.VITE_EMAILJS_TEMPLATE_ID_CONFIRM;
const EMAILJS_TEMPLATE_ID_DECISION = import.meta.env.VITE_EMAILJS_TEMPLATE_ID_DECISION;


// --- INITIALIZE FIREBASE & EMAILJS ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// Initialize EmailJS with Public Key
try {
    emailjs.init(EMAILJS_PUBLIC_KEY);
} catch (error) {
    console.error("Failed to initialize EmailJS. Check your Public Key.", error);
}


// --- GLOBAL STATE ---
let currentUser = null;
let currentUserRole = null;
let unsubscribeListeners = []; // To detach listeners on logout

// --- UI ELEMENTS ---
const views = document.querySelectorAll('.view');
const authView = document.getElementById('auth-view');
const loadingView = document.getElementById('loading-view');
const logoutBtn = document.getElementById('logout-btn');
const userEmailDisplay = document.getElementById('user-email-display');
const userEmailDisplayBtn = document.getElementById('user-email-display-btn'); // Button wrapper for email
const userRoleDisplay = document.getElementById('user-role-display');
const roleNavigation = document.getElementById('role-navigation'); // New nav bar

// Application-specific elements
const submitPaperForm = document.getElementById('submit-paper-form');
const addUserForm = document.getElementById('add-user-form');
const ownerPapersList = document.getElementById('owner-papers-list');
const trackChairPapersList = document.getElementById('track-chair-papers-list');
const reviewerPapersList = document.getElementById('reviewer-papers-list');
const authorPapersList = document.getElementById('author-papers-list');
const exportCsvBtn = document.getElementById('export-csv-btn');


// Modals and their controls
const assignModal = document.getElementById('assign-reviewer-modal');
const reviewerSelect = document.getElementById('reviewer-select');
const reviewModal = document.getElementById('submit-review-modal');
const submitReviewForm = document.getElementById('submit-review-form');
const viewReviewsModal = document.getElementById('view-reviews-modal');

// Profile Modal Elements
const profileModal = document.getElementById('profile-modal');
const closeProfileModalBtn = document.getElementById('close-profile-modal-btn');
const profileForm = document.getElementById('profile-form');
const profileEmail = document.getElementById('profile-email');
const profileRole = document.getElementById('profile-role');
const expertiseSection = document.getElementById('expertise-section');
const profileExpertise = document.getElementById('profile-expertise');
const changePasswordBtn = document.getElementById('change-password-btn');

// NEW Recommendation Modal Elements
const recommendationModal = document.getElementById('recommendation-modal');
const recommendationForm = document.getElementById('recommendation-form');
const cancelRecommendationBtn = document.getElementById('cancel-recommendation-btn');
const recommendationModalPaperTitle = document.getElementById('recommendation-modal-paper-title');
const recommendationModalPaperId = document.getElementById('recommendation-modal-paper-id');


// --- UTILITY FUNCTIONS ---
const showView = (viewId) => {
    views.forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(viewId).classList.add('active');
};

const getStatusBadge = (status) => {
     const colors = {
        'Submitted': 'bg-blue-100 text-blue-800',
        'Awaiting Assignment': 'bg-yellow-100 text-yellow-800',
        'Under Review': 'bg-purple-100 text-purple-800',
        'Awaiting Decision': 'bg-orange-100 text-orange-800',
        'Accepted': 'bg-green-100 text-green-800',
        'Rejected': 'bg-red-100 text-red-800',
        'Pending': 'bg-gray-100 text-gray-800',
        'Completed': 'bg-green-100 text-green-800',
        'Declined': 'bg-red-100 text-red-800'
    };
    return `<span class="px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}">${status}</span>`;
};

// --- NEW REAL EMAIL FUNCTION ---
const sendEmailNotification = async (templateId, templateParams) => {
    if (!EMAILJS_SERVICE_ID || !templateId || !EMAILJS_PUBLIC_KEY) {
        console.error("EmailJS environment variables are not set. Email not sent.");
        // Fallback to console log
        console.log("--- EMAIL SIMULATION (EmailJS keys missing) ---");
        console.log(`Template ID: ${templateId}`);
        console.log(`Params: ${JSON.stringify(templateParams)}`);
        console.log("-----------------------------------------------");
        return;
    }

    try {
        await emailjs.send(EMAILJS_SERVICE_ID, templateId, templateParams);
        console.log(`Successfully sent email with template ${templateId} to ${templateParams.author_email}`);
    } catch (error) {
        console.error(`Failed to send email using template ${templateId}.`, error);
    }
}

// --- UTILITY FUNCTION ---
// Checks all assignments for a paper and updates the paper's overall status
// if all reviews are completed or declined.
async function checkAndUpdatePaperStatus(paperId) {
    const paperAssignmentsQuery = query(collection(db, 'assignments'), where('paperId', '==', paperId));
    const assignmentSnapshot = await getDocs(paperAssignmentsQuery);
    
    if (assignmentSnapshot.empty) {
        return; // No assignments for this paper.
    }
    
    let allReviewsAreIn = true;
    assignmentSnapshot.forEach(doc => {
        const status = doc.data().status;
        // If any review is still pending or accepted (but not completed), not all are in.
        if (status === 'Pending' || status === 'Accepted') {
            allReviewsAreIn = false;
        }
    });

    if (allReviewsAreIn) {
        const paperRef = doc(db, 'papers', paperId);
        await updateDoc(paperRef, { status: 'Awaiting Decision' });
        console.log(`All reviews for paper ${paperId} are accounted for. Status updated to 'Awaiting Decision'.`);
    }
}

// --- AUTHENTICATION LOGIC ---
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const roleSelection = document.getElementById('role-selection');
const roleSelect = document.getElementById('role');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const authError = document.getElementById('auth-error');

signupBtn.addEventListener('click', async () => {
    roleSelection.style.display = 'block';
    authError.textContent = '';
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
        authError.textContent = 'Please enter email and password.';
        return;
    }
    try {
        // Step 1: Create the Auth user. This is the only part that can fail with 'email-already-in-use'.
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userDocRef = doc(db, "users", user.uid); // Define userDocRef here

        // Step 2: Auth user was created. Now handle the Firestore document.
        const usersRef = collection(db, "users");
        // Look for an 'invited' doc for this email.
        const q = query(usersRef, where("email", "==", email), where("status", "==", "invited"));
        const querySnapshot = await getDocs(q);

        let userRole = 'Author'; // Default role

        if (!querySnapshot.empty) {
            // Found an invitation. We'll update this doc to become the real user doc.
            const invitedDoc = querySnapshot.docs[0];
            userRole = invitedDoc.data().role;
            await updateDoc(doc(db, "users", invitedDoc.id), {
                uid: user.uid,
                status: 'active'
            });
            // Also create the main user doc at /users/{uid}
            await setDoc(userDocRef, {
                email: user.email,
                role: userRole,
                uid: user.uid,
                status: 'active',
                expertise: '' // Initialize expertise field
            });

        } else {
            // No invitation found. This is a regular user signing up.
            if (email === 'owner@conference.com') { userRole = 'Owner'; }
            // We will create a new doc for them, using their UID as the doc ID.
            await setDoc(userDocRef, {
                email: user.email,
                role: userRole,
                uid: user.uid,
                status: 'active',
                expertise: '' // Initialize expertise field
            });
        }

        console.log("User signed up and profile created with role:", userRole);
        roleSelection.style.display = 'none';

    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            authError.textContent = 'This email is already registered. Please use the Log In button.';
        } else {
            authError.textContent = error.message;
        }
    }
});

loginBtn.addEventListener('click', async () => {
    authError.textContent = '';
    roleSelection.style.display = 'none';
    if (!emailInput.value || !passwordInput.value) {
        authError.textContent = 'Please enter email and password.';
        return;
    }
    try {
        await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
        console.log("User logged in.");
    } catch (error) {
        authError.textContent = error.message;
    }
});

logoutBtn.addEventListener('click', async () => {
    roleNavigation.innerHTML = ''; // Clear nav tabs on logout
    await signOut(auth);
    console.log("User logged out.");
});

// --- AUTH STATE OBSERVER ---
// This block is the robust version from our previous discussion
onAuthStateChanged(auth, async (user) => {
    // Cleanup old listeners
    unsubscribeListeners.forEach(unsub => unsub());
    unsubscribeListeners = [];

    if (user) {
        currentUser = user;
        
        // Fetch the user's document directly by their UID.
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            // --- User document was found ---
            const userData = userDocSnap.data();
            currentUserRole = userData.role;
            userEmailDisplay.textContent = user.email;
            userRoleDisplay.textContent = `Role: ${currentUserRole}`;
            logoutBtn.style.display = 'block';
            setupUIForRole(currentUserRole);

        } else {
            // --- No user document found ---
            // This is normal for a first-time signup.
            // We will check if they were invited, or create a default (Author/Owner) doc.

            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", user.email), where("status", "==", "invited"));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // This is an invited user signing up. Let's update their 'invited' doc.
                const invitedDoc = querySnapshot.docs[0];
                await updateDoc(doc(db, "users", invitedDoc.id), {
                    uid: user.uid,
                    status: 'active'
                });
                // Now we also create their main user doc at /users/{uid}
                const newRole = invitedDoc.data().role;
                await setDoc(userDocRef, {
                    email: user.email,
                    role: newRole,
                    uid: user.uid,
                    status: 'active',
                    expertise: '' // Initialize expertise field
                });
                
                currentUserRole = newRole;
                userEmailDisplay.textContent = user.email;
                userRoleDisplay.textContent = `Role: ${currentUserRole}`;
                logoutBtn.style.display = 'block';
                setupUIForRole(currentUserRole);

            } else if (user.email === 'owner@conference.com') {
                 // Special case: First time the owner signs up
                await setDoc(userDocRef, {
                    email: user.email,
                    role: 'Owner',
                    uid: user.uid,
                    status: 'active',
                    expertise: '' // Initialize expertise field
                });
                currentUserRole = 'Owner';
                userEmailDisplay.textContent = user.email;
                userRoleDisplay.textContent = `Role: ${currentUserRole}`;
                logoutBtn.style.display = 'block';
                setupUIForRole(currentUserRole);
            
            } else {
                 // Standard new Author signup
                 await setDoc(userDocRef, {
                    email: user.email,
                    role: 'Author',
                    uid: user.uid,
                    status: 'active',
                    expertise: '' // Initialize expertise field
                });
                currentUserRole = 'Author';
                userEmailDisplay.textContent = user.email;
                userRoleDisplay.textContent = `Role: ${currentUserRole}`;
                logoutBtn.style.display = 'block';
                setupUIForRole(currentUserRole);
            }
        }
    } else {
        // User is logged out
        currentUser = null;
        currentUserRole = null;
        userEmailDisplay.textContent = '';
        userRoleDisplay.textContent = '';
        logoutBtn.style.display = 'none';
        roleNavigation.innerHTML = ''; // Clear nav tabs
        showView('auth-view');
    }
});


// --- ROLE-BASED NAVIGATION SETUP ---
function setupRoleNavigation(role) {
    roleNavigation.innerHTML = ''; // Clear old tabs
    let navHTML = '';

    const baseTabClass = "nav-tab inline-block py-2 px-4 font-semibold border-b-2 border-transparent hover:border-gray-300 hover:text-gray-700 cursor-pointer transition-colors duration-150";
    const activeTabClass = "active"; // This class is added by the event listener

    switch (role) {
        case 'Owner':
            navHTML = `
                <button class="${baseTabClass} ${activeTabClass}" data-target="owner-dashboard-section">Dashboard</button>
                <button class="${baseTabClass}" data-target="owner-papers-section">Paper Management</button>
                <button class="${baseTabClass}" data-target="owner-users-section">User Management</button>
            `;
            break;
        case 'Author':
            navHTML = `
                <button class="${baseTabClass} ${activeTabClass}" data-target="author-submissions-section">My Submissions</button>
                <button class="${baseTabClass}" data-target="author-submit-section">Submit New Paper</button>
            `;
            break;
        case 'TrackChair':
            navHTML = `
                <button class="${baseTabClass} ${activeTabClass}" data-target="trackchair-papers-section">My Assigned Papers</button>
            `;
            break;
        case 'Reviewer':
            navHTML = `
                <button class="${baseTabClass} ${activeTabClass}" data-target="reviewer-papers-section">My Review Assignments</button>
            `;
            break;
    }
    roleNavigation.innerHTML = navHTML;

    // Reset sections to default (first one active)
    const view = document.getElementById(`${role.toLowerCase()}-view`);
    if (view) {
        view.querySelectorAll('.role-section').forEach((section, index) => {
            if (index === 0) {
                section.classList.remove('hidden');
            } else {
                section.classList.add('hidden');
            }
        });
    }
}

// --- NAVIGATION TAB CLICK HANDLER ---
roleNavigation.addEventListener('click', (e) => {
    if (e.target.classList.contains('nav-tab')) {
        const targetId = e.target.dataset.target;
        if (!targetId || !currentUserRole) return; // Safety checks

        // Get the main view for the current user (e.g., 'owner-view')
        const parentViewId = `${currentUserRole.toLowerCase()}-view`;
        const parentView = document.getElementById(parentViewId);
        if (!parentView) return;
        
        // Hide all sections within that parent view
        parentView.querySelectorAll('.role-section').forEach(section => {
            section.classList.add('hidden');
        });
        
        // Show the target section
        const targetSection = document.getElementById(targetId);
        if(targetSection) {
            targetSection.classList.remove('hidden');
        }
        
        // Update active tab style (only within the nav bar)
        roleNavigation.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        e.target.classList.add('active');
    }
});

// --- ROLE-BASED UI SETUP ---
const setupUIForRole = (role) => {
    showView('loading-view');
    setupRoleNavigation(role); // Setup the navigation tabs
    
    // Delay to show loading and allow data to fetch
    setTimeout(() => {
        switch (role) {
            case 'Author':
                showView('author-view');
                initAuthorView();
                break;
            case 'Owner':
                showView('owner-view');
                initOwnerView();
                break;
            case 'TrackChair':
                showView('track-chair-view');
                initTrackChairView();
                break;
            case 'Reviewer':
                showView('reviewer-view');
                initReviewerView();
                break;
            default:
                showView('auth-view');
                break;
        }
    }, 500); // Reduced delay for faster feel
};
        
// --- APPLICATION EVENT LISTENERS (ATTACHED ONCE) ---

// Author: Submit Paper
submitPaperForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('paper-title').value;
    const abstract = document.getElementById('paper-abstract').value;
    const keywords = document.getElementById('paper-keywords').value;
    const paperLink = document.getElementById('paper-link').value;

    try {
        await addDoc(collection(db, 'papers'), {
            title,
            abstract,
            keywords: keywords.split(',').map(k => k.trim()),
            paperLink,
            authorId: currentUser.uid,
            authorEmail: currentUser.email,
            status: 'Submitted',
            submittedAt: serverTimestamp(),
        });
        
        // --- NEW: Send EmailJS confirmation ---
        const templateParams = {
            author_email: currentUser.email,
            paper_title: title
        };
        sendEmailNotification(EMAILJS_TEMPLATE_ID_CONFIRM, templateParams);
        // ------------------------------------

        submitPaperForm.reset();
        alert('Paper submitted successfully!');
        // Switch back to "My Submissions" tab
        document.querySelector('.nav-tab[data-target="author-submissions-section"]').click();
    } catch(error) {
        console.error("Error submitting paper: ", error);
        alert('Failed to submit paper.');
    }
});

// Owner: Add new user (TrackChair or Reviewer)
addUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('new-user-email').value;
    const role = document.getElementById('new-user-role').value;
    
    if (!email) {
        alert("Please enter an email.");
        return;
    }

    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);
        let alertMessage = '';

        if (!querySnapshot.empty) {
            // A document for this email already exists. Update its role.
            const userDoc = querySnapshot.docs[0];
            await updateDoc(doc(db, "users", userDoc.id), { role: role });
            alertMessage = `Updated role for existing user ${email} to ${role}. They can now log in to see their new dashboard.`;
        } else {
            // No document for this email exists. Create an 'invitation' document.
            await addDoc(collection(db, "users"), {
                email: email,
                role: role,
                uid: null, // UID will be added when the user signs up
                status: 'invited'
            });
            alertMessage = `Invitation sent to ${email} as a ${role}. They can now sign up on the main page.`;
        }
        
        // Note: This is a general "role set" email, not a specific "invitation" one.
        // We can reuse the submission template logic if we create a new template for this.
        // For now, keeping the console log.
        console.log("--- SIMULATING INVITATION EMAIL ---");
        console.log(`To: ${email}, Role: ${role}`);
        console.log("-----------------------------------");

        alert(alertMessage);
        addUserForm.reset();
    } catch(error) {
        console.error("Error managing user role:", error);
        alert("Failed to manage user role.");
    }
});

// Owner: Event Delegation for paper list actions
ownerPapersList.addEventListener('click', async (e) => {
    // Assign Track Chair
    if (e.target.classList.contains('assign-tc-btn')) {
        const paperId = e.target.dataset.paperId;
        const selectEl = document.querySelector(`.assign-tc-select[data-paper-id='${paperId}']`);
        const selectedValue = selectEl.value;
        if (!selectedValue) {
            alert("Please select a Track Chair.");
            return;
        }
        
        const [trackChairId, trackChairEmail] = selectedValue.split('|');

        try {
            const paperRef = doc(db, 'papers', paperId);
            await updateDoc(paperRef, { trackChairId, trackChairEmail, status: 'Awaiting Assignment' });
            
            const paperDoc = await getDoc(paperRef);
            const paperData = paperDoc.data();
            
            // This could also be a real email!
            console.log("--- SIMULATING 'ASSIGN TRACK CHAIR' EMAIL ---");
            console.log(`To: ${trackChairEmail}, Paper: ${paperData.title}`);
            console.log("---------------------------------------------");
            
            alert("Paper assigned successfully.");
        } catch (error) {
            console.error("Error assigning paper:", error);
            alert("Failed to assign paper.");
        }
    }

    // View Reviews
    if (e.target.classList.contains('view-reviews-btn')) {
        const paperId = e.target.dataset.paperId;
        const paperTitle = e.target.dataset.paperTitle;
        document.getElementById('reviews-modal-paper-title').textContent = paperTitle;
        const contentDiv = document.getElementById('reviews-modal-content');
        contentDiv.innerHTML = '<p>Loading reviews...</p>';
        viewReviewsModal.style.display = 'block';

        const reviewsQuery = query(collection(db, 'reviews'), where('paperId', '==', paperId));
        const reviewSnapshot = await getDocs(reviewsQuery);
        
        if (reviewSnapshot.empty) {
            contentDiv.innerHTML = '<p>No reviews have been submitted for this paper yet.</p>';
            return;
        }

        contentDiv.innerHTML = '';
        let reviewCounter = 1;
        reviewSnapshot.forEach(reviewDoc => {
            const review = reviewDoc.data();
            const reviewEl = document.createElement('div');
            reviewEl.className = 'p-3 border rounded-md bg-white';
            reviewEl.innerHTML = `
                <h5 class="font-bold text-md">Review ${reviewCounter++}</h5>
                <p class="text-sm font-semibold mt-2">Recommendation: <span class="font-normal">${review.recommendation}</span></p>
                <p class="text-sm font-semibold mt-2">Comments for Author:</p>
                <p class="text-sm p-2 bg-gray-100 rounded">${review.commentsForAuthor}</p>
                <p class="text-sm font-semibold mt-2">Confidential Comments for Chair:</p>
                <p class="text-sm p-2 bg-gray-100 rounded">${review.commentsForChair || 'None'}</p>
            `;
            contentDiv.appendChild(reviewEl);
        });
    }

    // Make Final Decision
    if (e.target.classList.contains('decision-btn')) {
        const paperId = e.target.dataset.paperId;
        const decision = e.target.dataset.decision; // 'Accepted' or 'Rejected'

        if (confirm(`Are you sure you want to ${decision.toLowerCase()} this paper?`)) {
            try {
                // 1. Get all data for the email
                const paperRef = doc(db, 'papers', paperId);
                const paperDoc = await getDoc(paperRef);
                const paperData = paperDoc.data();

                // 2. Fetch all reviewer comments
                const reviewsQuery = query(collection(db, 'reviews'), where('paperId', '==', paperId));
                const reviewSnapshot = await getDocs(reviewsQuery);
                let allReviewerComments = reviewSnapshot.docs.map((doc, index) => {
                    return `--- Reviewer ${index + 1} ---\n${doc.data().commentsForAuthor}`;
                }).join('\n\n');

                if (!allReviewerComments) {
                    allReviewerComments = "No detailed comments from reviewers were provided.";
                }

                // 3. Update the paper status
                await updateDoc(paperRef, { status: decision });
                
                // 4. Send the real email
                const templateParams = {
                    author_email: paperData.authorEmail,
                    paper_title: paperData.title,
                    final_decision: decision,
                    trackchair_comment: paperData.trackChairComment || "No final summary comment was provided by the Track Chair.",
                    reviewer_comments: allReviewerComments
                };
                sendEmailNotification(EMAILJS_TEMPLATE_ID_DECISION, templateParams);

                alert(`Paper has been ${decision.toLowerCase()} and the author has been notified.`);
            } catch (error) {
                console.error('Error making decision:', error);
                alert('Failed to make a decision.');
            }
        }
    }

    // View Paper Link
    if (e.target.classList.contains('view-paper-link-btn')) {
        const paperLink = e.target.dataset.paperLink;
        if (paperLink) {
            window.open(paperLink, '_blank');
        } else {
            alert("No paper link was provided for this submission.");
        }
    }
});

// Track Chair: Event Delegation for paper list actions
trackChairPapersList.addEventListener('click', async (e) => {
    // Open "Assign Reviewer" modal
    if(e.target.classList.contains('assign-rev-btn')) {
        const paperId = e.target.dataset.paperId;
        const paperTitle = e.target.dataset.paperTitle;
        
        document.getElementById('modal-paper-id').value = paperId;
        document.getElementById('modal-paper-title').textContent = `Paper: ${paperTitle}`;
        
        // Populate reviewers and SHOW EXPERTISE
        const revQuery = query(collection(db, "users"), where("role", "==", "Reviewer"), where("status", "==", "active"));
        const revSnapshot = await getDocs(revQuery);
        reviewerSelect.innerHTML = '';
        revSnapshot.forEach(doc => {
            const reviewer = doc.data();
            if(reviewer.uid){ // Ensure reviewer has signed up
                // --- NEW --- Add expertise to the option text
                const expertise = reviewer.expertise ? ` (${reviewer.expertise})` : '';
                const option = new Option(`${reviewer.email}${expertise}`, `${reviewer.uid}|${reviewer.email}`);
                reviewerSelect.add(option);
            }
        });
        
        assignModal.style.display = 'block';
    }

    // --- NEW: Open "Submit Recommendation" modal ---
    if (e.target.classList.contains('recommend-btn')) {
        const paperId = e.target.dataset.paperId;
        const paperTitle = e.target.dataset.paperTitle;
        
        // Populate modal
        recommendationModalPaperId.value = paperId;
        recommendationModalPaperTitle.textContent = `Paper: ${paperTitle}`;
        recommendationForm.reset();
        
        // Show modal
        recommendationModal.style.display = 'block';
    }

    // View Paper Link
    if (e.target.classList.contains('view-paper-link-btn')) {
        const paperLink = e.target.dataset.paperLink;
        if (paperLink) {
            window.open(paperLink, '_blank');
        } else {
            alert("No paper link was provided for this submission.");
        }
    }
});

// Track Chair: Assign Reviewer Modal buttons
document.getElementById('cancel-assign-btn').addEventListener('click', () => {
    assignModal.style.display = 'none';
});

document.getElementById('confirm-assign-btn').addEventListener('click', async () => {
    const paperId = document.getElementById('modal-paper-id').value;
    const selectedOptions = Array.from(reviewerSelect.selectedOptions);
    if (selectedOptions.length === 0) {
        alert('Please select at least one reviewer.');
        return;
    }

    const paperRef = doc(db, 'papers', paperId);
    const paperDoc = await getDoc(paperRef);
    const paperData = paperDoc.data();

    const assignments = selectedOptions.map(opt => {
         const [reviewerId, reviewerEmail] = opt.value.split('|');
         return {
             paperId,
             paperTitle: paperData.title,
             reviewerId,
             reviewerEmail,
             trackChairId: currentUser.uid,
             status: 'Pending',
             assignedAt: serverTimestamp()
         };
    });
    
    // Create assignment docs and update paper status
    const batchPromises = assignments.map(async (assignment) => {
        await addDoc(collection(db, 'assignments'), assignment);
        
        // This could also be a real email
        console.log("--- SIMULATING 'ASSIGN REVIEWER' EMAIL ---");
        console.log(`To: ${assignment.reviewerEmail}, Paper: ${assignment.paperTitle}`);
        console.log("-------------------------------------------");
    });
    
    await Promise.all(batchPromises);
    
    // Update paper with reviewer info for display
    const reviewerInfoForPaper = assignments.map(a => ({uid: a.reviewerId, email: a.reviewerEmail, status: 'Pending'}));
    await updateDoc(paperRef, {
        status: 'Under Review',
        reviewers: reviewerInfoForPaper
    });
    
    assignModal.style.display = 'none';
    alert('Reviewers assigned successfully.');
});

// --- NEW: Track Chair Recommendation Modal Listeners ---
cancelRecommendationBtn.addEventListener('click', () => {
    recommendationModal.style.display = 'none';
});

recommendationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const paperId = recommendationModalPaperId.value;
    const recommendation = document.getElementById('trackchair-recommendation').value;
    const comment = document.getElementById('trackchair-comment').value;

    if (!recommendation) {
        alert("Please select a recommendation.");
        return;
    }
    
    try {
        const paperRef = doc(db, 'papers', paperId);
        await updateDoc(paperRef, {
            trackChairRecommendation: recommendation,
            trackChairComment: comment
        });
        
        alert("Recommendation submitted to the Owner.");
        recommendationModal.style.display = 'none';
    } catch (error) {
        console.error("Error submitting recommendation:", error);
        alert("Failed to submit recommendation.");
    }
});

// Reviewer: Accept/Decline/Submit buttons (event delegation)
reviewerPapersList.addEventListener('click', async (e) => {
    // Handle view paper link button
    if (e.target.classList.contains('view-paper-link-btn')) {
        const paperLink = e.target.dataset.paperLink;
        if (paperLink) {
            window.open(paperLink, '_blank');
        } else {
            alert("No paper link was provided for this submission.");
        }
        return;
    }

    const assignmentId = e.target.dataset.assignmentId;
    if (!assignmentId) return;

    const assignmentRef = doc(db, 'assignments', assignmentId);
    const assignmentDoc = await getDoc(assignmentRef);
    const assignmentData = assignmentDoc.data();
    const paperRef = doc(db, 'papers', assignmentData.paperId);

    async function updatePaperReviewerStatus(newStatus) {
        const paperDoc = await getDoc(paperRef);
        const paperData = paperDoc.data();
        if (paperData.reviewers && Array.isArray(paperData.reviewers)) {
            const updatedReviewers = paperData.reviewers.map(r => {
                if (r.uid === currentUser.uid) {
                    return { ...r, status: newStatus };
                }
                return r;
            });
            await updateDoc(paperRef, { reviewers: updatedReviewers });
        }
    }
    
    if(e.target.classList.contains('accept-review-btn')) {
        await updateDoc(assignmentRef, { status: 'Accepted' });
        await updatePaperReviewerStatus('Accepted');
        alert('Review accepted.');
    }
    
    if(e.target.classList.contains('decline-review-btn')) {
        await updateDoc(assignmentRef, { status: 'Declined' });
        await updatePaperReviewerStatus('Declined');
        await checkAndUpdatePaperStatus(assignmentData.paperId); // Check status on decline
        alert('Review declined.');
    }
    
    if(e.target.classList.contains('submit-review-btn')) {
        const paperId = e.target.dataset.paperId;
        const paperTitle = e.target.dataset.paperTitle;
        
        document.getElementById('review-modal-paper-id').value = paperId;
        document.getElementById('review-modal-assignment-id').value = assignmentId;
        document.getElementById('review-modal-paper-title').textContent = `Paper: ${paperTitle}`;
        reviewModal.style.display = 'block';
    }
});

// Reviewer: Submit Review Modal buttons
document.getElementById('cancel-review-btn').addEventListener('click', () => {
    reviewModal.style.display = 'none';
});

submitReviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const paperId = document.getElementById('review-modal-paper-id').value;
    const assignmentId = document.getElementById('review-modal-assignment-id').value;
    
    const reviewData = {
        paperId: paperId,
        reviewerId: currentUser.uid,
        assignmentId: assignmentId,
        recommendation: document.getElementById('review-recommendation').value,
        commentsForAuthor: document.getElementById('review-comments-author').value,
        commentsForChair: document.getElementById('review-comments-confidential').value,
        submittedAt: serverTimestamp()
    };

    try {
        // Add review to a new collection
        await addDoc(collection(db, 'reviews'), reviewData);
        
        // Update assignment status
        const assignmentRef = doc(db, 'assignments', assignmentId);
        await updateDoc(assignmentRef, { status: 'Completed' });

        // Update reviewer status on the paper itself
        const paperRef = doc(db, 'papers', paperId);
        const paperDoc = await getDoc(paperRef);
        const paperData = paperDoc.data();
        if (paperData.reviewers && Array.isArray(paperData.reviewers)) {
            const updatedReviewers = paperData.reviewers.map(r => {
                if (r.uid === currentUser.uid) {
                    return { ...r, status: 'Completed' };
                }
                return r;
            });
            await updateDoc(paperRef, { reviewers: updatedReviewers });
        }
        
        reviewModal.style.display = 'none';
        document.getElementById('submit-review-form').reset();
        alert("Review submitted successfully!");

        // Check if all reviews for this paper are done
        await checkAndUpdatePaperStatus(paperId);

    } catch(error) {
        console.error("Error submitting review: ", error);
        alert("Failed to submit review.");
    }
});

// Close View Reviews Modal
document.getElementById('close-reviews-modal-btn').addEventListener('click', () => {
    viewReviewsModal.style.display = 'none';
});

// --- PROFILE MODAL LISTENERS ---

// Open Modal
userEmailDisplayBtn.addEventListener('click', async () => {
    if (!currentUser) return;

    // 1. Populate static info
    profileEmail.value = currentUser.email;
    profileRole.value = currentUserRole;
    
    // 2. Clear and hide expertise section by default
    profileExpertise.value = '';
    expertiseSection.style.display = 'none';

    // 3. If Reviewer, fetch and show expertise
    if (currentUserRole === 'Reviewer') {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            profileExpertise.value = userData.expertise || '';
        }
        expertiseSection.style.display = 'block';
    }

    // 4. Show the modal
    profileModal.style.display = 'block';
});

// Close Modal
closeProfileModalBtn.addEventListener('click', () => {
    profileModal.style.display = 'none';
});

// Save Profile Form
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Only Reviewers have something to save
    if (currentUserRole === 'Reviewer') {
        const newExpertise = profileExpertise.value;
        const userDocRef = doc(db, "users", currentUser.uid);
        try {
            await updateDoc(userDocRef, {
                expertise: newExpertise
            });
            alert("Profile updated successfully!");
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile.");
        }
    }
    profileModal.style.display = 'none';
});

// Change Password Button
changePasswordBtn.addEventListener('click', async () => {
    if (!currentUser) return;

    if (confirm("This will send a password reset link to your email. Are you sure?")) {
        try {
            await sendPasswordResetEmail(auth, currentUser.email);
            alert("Password reset email sent! Please check your inbox.");
            profileModal.style.display = 'none';
        } catch (error) {
            console.error("Error sending password reset email:", error);
            alert("Failed to send reset email. Please try again later.");
        }
    }
});


// Author: View Decision & Feedback
authorPapersList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('view-decision-btn')) {
        const paperId = e.target.dataset.paperId;
        const paperTitle = e.target.dataset.paperTitle;
        document.getElementById('reviews-modal-paper-title').textContent = paperTitle;
        const contentDiv = document.getElementById('reviews-modal-content');
        contentDiv.innerHTML = '<p>Loading feedback...</p>';
        viewReviewsModal.style.display = 'block';

        const reviewsQuery = query(collection(db, 'reviews'), where('paperId', '==', paperId));
        const reviewSnapshot = await getDocs(reviewsQuery);
        
        if (reviewSnapshot.empty) {
            contentDiv.innerHTML = '<p>No feedback is available for this paper yet.</p>';
            return;
        }

        contentDiv.innerHTML = '';
        let reviewCounter = 1;
        reviewSnapshot.forEach(reviewDoc => {
            const review = reviewDoc.data();
            const reviewEl = document.createElement('div');
            reviewEl.className = 'p-3 border rounded-md bg-white';
            reviewEl.innerHTML = `
                <h5 class="font-bold text-md">Feedback from Reviewer ${reviewCounter++}</h5>
                <p class="text-sm p-2 bg-gray-100 rounded mt-2">${review.commentsForAuthor}</p>
            `;
            contentDiv.appendChild(reviewEl);
        });
    }
});

// Owner: Export to CSV
exportCsvBtn.addEventListener('click', async () => {
    const papersQuery = query(collection(db, "papers"));
    const snapshot = await getDocs(papersQuery);
    if (snapshot.empty) {
        alert("No papers to export.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    // Define headers
    const headers = [
        "Paper Title",
        "Author Email",
        "Status",
        "Submission Date",
        "Paper Link",
        "Assigned Track Chair",
        "Assigned Reviewers"
    ];
    csvContent += headers.join(",") + "\r\n";

    snapshot.forEach(doc => {
        const paper = doc.data();
        const reviewers = (paper.reviewers || []).map(r => r.email).join("; "); // Use semicolon to avoid comma issues
        const submissionDate = paper.submittedAt ? new Date(paper.submittedAt.seconds * 1000).toLocaleDateString() : "N/A";
        
        // Escape commas and quotes in title
        const escapeCsv = (str) => `"${(str || '').replace(/"/g, '""')}"`;

        const row = [
            escapeCsv(paper.title),
            escapeCsv(paper.authorEmail),
            escapeCsv(paper.status),
            submissionDate,
            escapeCsv(paper.paperLink),
            escapeCsv(paper.trackChairEmail),
            escapeCsv(reviewers)
        ];
        csvContent += row.join(",") + "\r\n";
    });

    // Create and trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "conference_papers_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});


// --- AUTHOR VIEW LOGIC ---
function initAuthorView() {
    // Listen for this author's papers
    const q = query(collection(db, 'papers'), where('authorId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        authorPapersList.innerHTML = '';
        if(querySnapshot.empty){
            authorPapersList.innerHTML = '<p class="text-gray-500">You have not submitted any papers yet.</p>';
            return;
        }
        querySnapshot.forEach(doc => {
            const paper = { id: doc.id, ...doc.data()};
            const paperEl = document.createElement('div');
            paperEl.className = 'p-4 border rounded-md bg-gray-50';
            
            let decisionHTML = '';
            if (paper.status === 'Accepted' || paper.status === 'Rejected') {
                decisionHTML = `<button data-paper-id="${paper.id}" data-paper-title="${paper.title}" class="view-decision-btn mt-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-1 px-3 rounded-md text-sm">View Decision & Feedback</button>`;
            }

            paperEl.innerHTML = `
                <div class="flex justify-between items-start">
                   <div>
                        <h4 class="font-bold">${paper.title}</h4>
                        <p class="text-sm text-gray-600">${paper.abstract.substring(0, 100)}...</p>
                        ${decisionHTML}
                    </div>
                    ${getStatusBadge(paper.status)}
                </div>
            `;
            authorPapersList.appendChild(paperEl);
        });
    });
    unsubscribeListeners.push(unsubscribe);
}

// --- OWNER VIEW LOGIC ---
function initOwnerView() {
    const trackChairsList = document.getElementById('track-chairs-list');
    const reviewersList = document.getElementById('reviewers-list');
    
    // Listen for users and populate lists
    const usersQuery = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
        trackChairsList.innerHTML = '';
        reviewersList.innerHTML = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            const li = document.createElement('li');
            li.textContent = user.email;
            if(user.role === 'TrackChair') {
                trackChairsList.appendChild(li);
            } else if (user.role === 'Reviewer') {
                reviewersList.appendChild(li);
            }
        });
    });
    unsubscribeListeners.push(unsubUsers);

    // Listen for all papers
    const papersQuery = query(collection(db, 'papers'));
    const unsubPapers = onSnapshot(papersQuery, async (snapshot) => {
        ownerPapersList.innerHTML = '';
        let total = 0, needsAssignment = 0, underReview = 0, awaitingDecision = 0;
        
        const trackChairs = [];
        const tcQuery = query(collection(db, "users"), where("role", "==", "TrackChair"), where("status", "==", "active"));
        const tcSnapshot = await getDocs(tcQuery);
        tcSnapshot.forEach(doc => trackChairs.push({ id: doc.id, ...doc.data() }));

        snapshot.forEach(doc => {
            total++;
            const paper = { id: doc.id, ...doc.data() };
            
            if(paper.status === 'Submitted') needsAssignment++;
            if(paper.status === 'Under Review') underReview++;
            if(paper.status === 'Awaiting Decision') awaitingDecision++;

            const paperEl = document.createElement('div');
            paperEl.className = 'p-4 border rounded-md bg-gray-50';
            let actionHTML = '';
            if (paper.status === 'Submitted') {
                 const options = trackChairs.map(tc => `<option value="${tc.uid}|${tc.email}">${tc.email}</option>`).join('');
                 actionHTML = `
                    <div class="mt-4 flex items-center space-x-2">
                        <select data-paper-id="${paper.id}" class="assign-tc-select w-full p-2 border rounded-md">
                            <option value="">Assign to Track Chair...</option>
                            ${options}
                        </select>
                        <button data-paper-id="${paper.id}" class="assign-tc-btn bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md">Assign</button>
                    </div>
                 `;
            } else if (paper.status === 'Awaiting Decision') {
                actionHTML = `
                    <div class="mt-4 flex items-center space-x-2">
                        <button data-paper-id="${paper.id}" data-paper-title="${paper.title}" class="view-reviews-btn bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md">View Reviews</button>
                        <button data-paper-id="${paper.id}" data-decision="Accepted" class="decision-btn bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md">Accept</button>
                        <button data-paper-id="${paper.id}" data-decision="Rejected" class="decision-btn bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md">Reject</button>
                    </div>
                `;
            }
            
            // Display assigned reviewers and their status
            let reviewersHTML = '';
            if (paper.reviewers && paper.reviewers.length > 0) {
                reviewersHTML = `
                    <div class="mt-4 pt-2 border-t">
                        <h5 class="font-semibold text-sm text-gray-700">Reviewer Status:</h5>
                        <ul class="mt-1 space-y-1">
                            ${paper.reviewers.map(r => `<li class="text-sm text-gray-600">${r.email} - ${getStatusBadge(r.status)}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }

            paperEl.innerHTML = `
                 <div class="flex justify-between items-start">
                   <div>
                        <h4 class="font-bold">${paper.title}</h4>
                        <p class="text-sm text-gray-500">By: ${paper.authorEmail}</p>
                        <p class="text-sm text-gray-600 mt-1">
                            Assigned to: <span class="font-semibold">${paper.trackChairEmail || 'N/A'}</span>
                        </p>
                    </div>
                    ${getStatusBadge(paper.status)}
                </div>
                <div class="mt-2">
                    <button data-paper-link="${paper.paperLink}" class="view-paper-link-btn bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-1 px-3 rounded-md text-sm">View Paper</button>
                </div>
                ${actionHTML}
                ${reviewersHTML}
            `;
            ownerPapersList.appendChild(paperEl);
        });
        
        document.getElementById('owner-total-papers').textContent = total;
        document.getElementById('owner-needs-assignment').textContent = needsAssignment;
        document.getElementById('owner-under-review').textContent = underReview;
        document.getElementById('owner-awaiting-decision').textContent = awaitingDecision;

    });
    unsubscribeListeners.push(unsubPapers);
}

// --- TRACK CHAIR VIEW LOGIC ---
function initTrackChairView() {
    const papersList = document.getElementById('track-chair-papers-list');
    
    const q = query(collection(db, 'papers'), where('trackChairId', '==', currentUser.uid));
    const unsub = onSnapshot(q, (snapshot) => {
        papersList.innerHTML = '';
        if(snapshot.empty){
            papersList.innerHTML = '<p class="text-gray-500">You have not been assigned any papers yet.</p>';
            return;
        }
        snapshot.forEach(doc => {
            const paper = { id: doc.id, ...doc.data() };
            const paperEl = document.createElement('div');
            paperEl.className = 'p-4 border rounded-md bg-white shadow-sm';

            let buttonHTML = '';
             if (paper.status === 'Awaiting Assignment' || paper.status === 'Under Review') {
                buttonHTML = `<button data-paper-id="${paper.id}" data-paper-title="${paper.title}" class="assign-rev-btn mt-4 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md">Manage Reviewers</button>`;
            } else if (paper.status === 'Awaiting Decision') {
                // NEW: Show recommendation button
                buttonHTML = `<button data-paper-id="${paper.id}" data-paper-title="${paper.title}" class="recommend-btn mt-4 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md">Submit Recommendation</button>`;
            }

            // Display assigned reviewers
            let reviewersHTML = '<p class="text-sm text-gray-500">No reviewers assigned.</p>';
            if (paper.reviewers && paper.reviewers.length > 0) {
                reviewersHTML = '<ul class="mt-1 space-y-1">' + paper.reviewers.map(r => `<li class="text-sm text-gray-700">${r.email} - ${getStatusBadge(r.status)}</li>`).join('') + '</ul>';
            }

            paperEl.innerHTML = `
                <div class="flex justify-between items-start">
                   <div>
                        <h4 class="font-bold">${paper.title}</h4>
                        <p class="text-sm text-gray-500">By: ${paper.authorEmail}</p>
                    </div>
                    ${getStatusBadge(paper.status)}
                </div>
                <div class="mt-2">
                    <button data-paper-link="${paper.paperLink}" class="view-paper-link-btn bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-1 px-3 rounded-md text-sm">View Paper</button>
                </div>
                <div class="mt-4">
                    <h5 class="font-semibold text-sm">Assigned Reviewers:</h5>
                    ${reviewersHTML}
                </div>
                ${buttonHTML}
            `;
            papersList.appendChild(paperEl);
        });
    });
    unsubscribeListeners.push(unsub);
}

// --- REVIEWER VIEW LOGIC ---
function initReviewerView() {
    const papersList = document.getElementById('reviewer-papers-list');
    
    const q = query(collection(db, 'assignments'), where('reviewerId', '==', currentUser.uid));
    const unsub = onSnapshot(q, async (snapshot) => {
        papersList.innerHTML = '';
         if(snapshot.empty){
            papersList.innerHTML = '<p class="text-gray-500">You have no review assignments.</p>';
            return;
        }
        
        // Fetch paper details to get paper links
        const paperIds = [...new Set(snapshot.docs.map(doc => doc.data().paperId))];
        const papers = {};
        if (paperIds.length > 0) {
            // Firestore 'in' queries are limited to 30 items.
            const chunks = [];
            for (let i = 0; i < paperIds.length; i += 30) {
                chunks.push(paperIds.slice(i, i + 30));
            }
            
            for (const chunk of chunks) {
                const papersQuery = query(collection(db, 'papers'), where('__name__', 'in', chunk));
                const paperSnapshot = await getDocs(papersQuery);
                paperSnapshot.forEach(doc => {
                    papers[doc.id] = doc.data();
                });
            }
        }
        
        snapshot.forEach(doc => {
            const assignment = {id: doc.id, ...doc.data()};
            const paper = papers[assignment.paperId];
            const paperLink = paper ? paper.paperLink : '';

            const paperEl = document.createElement('div');
            paperEl.className = 'p-4 border rounded-md bg-white shadow-sm';
            
            let actionsHTML = '';
            if(assignment.status === 'Pending') {
                actionsHTML = `
                    <div class="mt-4 space-x-2">
                        <button data-assignment-id="${assignment.id}" class="accept-review-btn bg-green-500 text-white px-3 py-1 rounded text-sm">Accept</button>
                        <button data-assignment-id="${assignment.id}" class="decline-review-btn bg-red-500 text-white px-3 py-1 rounded text-sm">Decline</button>
                    </div>
                `;
            } else if (assignment.status === 'Accepted') {
                actionsHTML = `
                     <div class="mt-4">
                        <button data-assignment-id="${assignment.id}" data-paper-id="${assignment.paperId}" data-paper-title="${assignment.paperTitle}" class="submit-review-btn bg-indigo-500 text-white px-4 py-2 rounded">Submit Review</button>
                    </div>
                `;
            }
            
             paperEl.innerHTML = `
                <div class="flex justify-between items-start">
                   <div>
                        <h4 class="font-bold">${assignment.paperTitle}</h4>
                        <button data-paper-link="${paperLink}" class="view-paper-link-btn mt-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-1 px-3 rounded-md text-sm">View Paper</button>
                    </div>
                    ${getStatusBadge(assignment.status)}
                </div>
                ${actionsHTML}
            `;
            papersList.appendChild(paperEl);
        });
    });
    unsubscribeListeners.push(unsub);
}