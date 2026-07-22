import { auth, db } from "../firebaseInit.js";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

export async function renderProfile(container) {
  const user = auth.currentUser;
  if (!user) {
    container.innerHTML = `<div class="text-center mt-4"><h3>Initializing session...</h3></div>`;
    return;
  }

  container.innerHTML = `<div class="text-center mt-4"><h3>Loading Profile Career...</h3></div>`;

  try {
    // 1. Fetch User Stats
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    let stats = { totalCampaigns: 0, perfectRuns: 0, bestNRR: 0.0 };
    let displayName = user.displayName || "Anonymous Player";

    if (userSnap.exists()) {
      const uData = userSnap.data();
      if (uData.stats) stats = uData.stats;
      if (uData.displayName) displayName = uData.displayName;
    }

    // 2. Fetch User Campaigns
    const q = query(
      collection(db, "campaigns"),
      where("ownerUid", "==", user.uid)
    );
    const snap = await getDocs(q);

    const campaigns = [];
    snap.forEach(doc => {
      campaigns.push({ id: doc.id, ...doc.data() });
    });

    // Sort campaigns by date desc
    campaigns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    renderProfileLayout(container, displayName, stats, campaigns);
  } catch (err) {
    console.error("Error loading profile:", err);
    container.innerHTML = `<h3 class="text-red text-center mt-4">Failed to load profile details.</h3>`;
  }
}

function renderProfileLayout(container, displayName, stats, campaigns) {
  container.innerHTML = `
    <div class="profile-container">
      <div class="profile-header-card">
        <div class="profile-avatar">🏏</div>
        <div class="profile-info">
          <h2>${displayName}</h2>
          <p>${auth.currentUser.isAnonymous ? "Guest Session (Anonymous)" : "Google Linked Account"}</p>
        </div>
      </div>

      <div class="profile-grid mt-4">
        <!-- Stats Summary -->
        <div class="profile-summary-col">
          <div class="career-stats-widget">
            <h3>Career Summary</h3>
            <div class="career-stats-grid mt-2">
              <div class="cs-item">
                <span class="cs-val">${stats.totalCampaigns}</span>
                <span class="cs-lbl">Campaigns Played</span>
              </div>
              <div class="cs-item">
                <span class="cs-val text-gold">${stats.perfectRuns}</span>
                <span class="cs-lbl">Perfect Runs</span>
              </div>
              <div class="cs-item">
                <span class="cs-val">${stats.bestNRR > 0 ? "+" : ""}${stats.bestNRR.toFixed(3)}</span>
                <span class="cs-lbl">Best NRR</span>
              </div>
            </div>
          </div>
        </div>

        <!-- History List -->
        <div class="profile-history-col">
          <h3>Your Campaigns History</h3>
          <div class="history-list mt-2">
            ${campaigns.length === 0 ? `
              <div class="text-center p-4" style="color: var(--chalk-white-dark);">
                <p>You haven't started any campaigns yet!</p>
                <a href="#/draft" class="btn btn-primary mt-2">Start First Campaign</a>
              </div>
            ` : campaigns.map((camp, idx) => {
              let statusLabel = "Drafting";
              let statusClass = "pending";
              let linkHref = "#/draft";
              let linkText = "Resume Drafting";

              if (camp.status === "inProgress") {
                statusLabel = "In Progress";
                statusClass = "in-progress";
                linkHref = "#/tournament";
                linkText = "Resume Campaign";
              } else if (camp.status === "complete") {
                statusLabel = "Completed";
                statusClass = "complete";
                linkHref = "#/summary";
                linkText = "View Campaign Standings";
              }

              const dateStr = new Date(camp.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric"
              });

              return `
                <div class="history-item">
                  <div class="hi-info">
                    <strong>Campaign #${campaigns.length - idx}</strong>
                    <span>Started: ${dateStr}</span>
                    <div class="mt-1">
                      <span class="status-badge ${statusClass}">${statusLabel}</span>
                    </div>
                  </div>
                  <div class="hi-action">
                    <a href="${linkHref}" class="btn btn-secondary btn-sm">${linkText}</a>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}
