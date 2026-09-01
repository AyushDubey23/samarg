/**
 * Custom 404 Not Found & Offline View for SAMARG (Cricket Draft & World Cup Simulator)
 */

export function renderNotFound(container, options = {}) {
  const isOfflineMode = options.isOffline || !navigator.onLine;

  const commentaryQuotes = [
    "“DECISION PENDING... Third Umpire confirms: The page you requested was CLEAN BOWLED outside off stump!”",
    "“EDGE AND TAKEN! The ball carried straight to slip, but the page was nowhere in sight!”",
    "“LOST BALL IN THE STANDS! That shot went out of the stadium and into the 404 dimension.”",
    "“HIT WICKET! The batsman stepped onto his own wickets trying to find this route.”",
    "“LBW APPEAL! Plumb in front. Pitching outside off, hitting middle, page is definitely OUT!”"
  ];

  const offlineQuote = "“DECISION PENDING... Third Umpire confirms: Your Internet Connection was CLEAN BOWLED! Please check your Wi-Fi or mobile data connection to return to live match play.”";

  const randomQuote = isOfflineMode ? offlineQuote : commentaryQuotes[Math.floor(Math.random() * commentaryQuotes.length)];

  container.innerHTML = `
    <div class="landing-hero" style="min-height: 80vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem 1rem;">
      
      <!-- 404 Main Card -->
      <div style="width: 100%; max-width: 620px; background: #FFFFFF; border: 3px solid #1E1E1E; box-shadow: 8px 8px 0px #1E1E1E; padding: 2.5rem 1.8rem; text-align: center; position: relative;">
        
        <!-- Top Status Tag -->
        <div style="display: inline-block; background: #E53926; color: #FFFFFF; font-weight: 900; font-size: 0.85rem; padding: 4px 14px; border: 2px solid #1E1E1E; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1.5rem; box-shadow: 3px 3px 0px #1E1E1E;">
          ${isOfflineMode ? '⚡ 404 • NO INTERNET / OUT OF BOUNDS' : '⚡ 404 • HIT WICKET / OUT!'}
        </div>

        <!-- Animated Stumps Graphic -->
        <div class="cricket-wicket-illustration" style="margin: 1rem auto 1.5rem auto; width: 140px; height: 110px; position: relative; display: flex; justify-content: center; align-items: flex-end;">
          <!-- Pitch line -->
          <div style="position: absolute; bottom: 0; width: 100%; height: 6px; background: #277748; border: 1.5px solid #1E1E1E;"></div>
          
          <!-- Stumps -->
          <div style="display: flex; gap: 14px; align-items: flex-end; padding-bottom: 6px;">
            <!-- Stump 1 -->
            <div style="width: 10px; height: 65px; background: #C89B3C; border: 1.5px solid #1E1E1E; border-radius: 2px 2px 0 0;"></div>
            <!-- Stump 2 (tilted) -->
            <div style="width: 10px; height: 65px; background: #C89B3C; border: 1.5px solid #1E1E1E; border-radius: 2px 2px 0 0; transform: rotate(18deg); transform-origin: bottom center;"></div>
            <!-- Stump 3 -->
            <div style="width: 10px; height: 65px; background: #C89B3C; border: 1.5px solid #1E1E1E; border-radius: 2px 2px 0 0;"></div>
          </div>

          <!-- Flying Bails -->
          <div style="position: absolute; top: 15px; left: 35px; width: 22px; height: 5px; background: #E53926; border: 1px solid #1E1E1E; transform: rotate(-35deg); animation: bailFly 2s infinite ease-in-out alternate;"></div>
          <div style="position: absolute; top: 10px; right: 35px; width: 22px; height: 5px; background: #E53926; border: 1px solid #1E1E1E; transform: rotate(42deg); animation: bailFly2 2.2s infinite ease-in-out alternate;"></div>

          <!-- Cricket Ball -->
          <div style="position: absolute; bottom: 6px; right: 10px; width: 20px; height: 20px; background: #E53926; border: 1.5px solid #1E1E1E; border-radius: 50%; box-shadow: inset -2px -2px 0px rgba(0,0,0,0.3);"></div>
        </div>

        <!-- 404 Large Header -->
        <h1 style="font-size: 3.2rem; font-weight: 900; color: #111111; margin: 0; line-height: 1; letter-spacing: -1px; text-transform: uppercase;">
          ${isOfflineMode ? 'NO INTERNET CONNECTION' : 'PAGE NOT FOUND'}
        </h1>

        <!-- Commentary Box -->
        <div style="margin: 1.5rem 0; padding: 1rem 1.25rem; background: #FAF6ED; border: 2px dashed #1E1E1E; text-align: center;">
          <p style="font-family: var(--font-family-mono); font-size: 0.92rem; color: #111111; font-weight: 700; margin: 0; line-height: 1.5;">
            ${randomQuote}
          </p>
        </div>

        <p style="font-size: 0.95rem; color: #555555; font-weight: 600; margin-bottom: 2rem;">
          ${isOfflineMode 
            ? 'You reloaded SAMARG while offline. Reconnect to internet to synchronize live draft lobbies and match simulations.' 
            : 'The URL hash or page route you entered does not exist or has been removed from the tournament schedule.'}
        </p>

        <!-- Navigation Buttons -->
        <div style="display: flex; flex-wrap: wrap; gap: 0.85rem; justify-content: center;">
          ${isOfflineMode ? `
            <button id="retry-net-btn" class="btn btn-primary" style="padding: 0.75rem 1.4rem; font-weight: 900; font-size: 0.95rem;">
              ⚡ Retry Connection
            </button>
          ` : `
            <a href="#/" class="btn btn-primary" style="padding: 0.75rem 1.4rem; font-weight: 900; text-decoration: none; font-size: 0.95rem;">
              🏠 Return to Pitch (Home)
            </a>
          `}
          <a href="#/draft" class="btn btn-secondary" style="padding: 0.75rem 1.4rem; font-weight: 900; text-decoration: none; font-size: 0.95rem;">
            🏏 Start a Draft
          </a>
          <a href="#/leaderboard" class="btn btn-secondary" style="padding: 0.75rem 1.4rem; font-weight: 900; text-decoration: none; font-size: 0.95rem;">
            🏆 Leaderboard
          </a>
        </div>

      </div>

    </div>

    <style>
      @keyframes bailFly {
        0% { transform: translate(0, 0) rotate(-35deg); }
        100% { transform: translate(-8px, -12px) rotate(-65deg); }
      }
      @keyframes bailFly2 {
        0% { transform: translate(0, 0) rotate(42deg); }
        100% { transform: translate(10px, -15px) rotate(85deg); }
      }
    </style>
  `;

  if (isOfflineMode) {
    const retryBtn = container.querySelector("#retry-net-btn");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        if (navigator.onLine) {
          window.location.reload();
        } else {
          if (window.showToast) window.showToast("Still offline! Check your network connection.", true);
        }
      });
    }
  }
}
