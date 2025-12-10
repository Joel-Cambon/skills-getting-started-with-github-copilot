document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function showMessage(text, type = "info", timeout = 5000) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");
    if (timeout) setTimeout(() => messageDiv.classList.add("hidden"), timeout);
  }

  // Simple HTML escape to avoid injecting raw content
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message and reset UI
      activitiesList.innerHTML = "";
      // Reset select options to avoid duplicates when reloading
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = (details.max_participants ?? Infinity) - (details.participants?.length ?? 0);

        // Create participants list element
        let participantsNode;
        if (Array.isArray(details.participants) && details.participants.length) {
          const section = document.createElement("div");
          section.className = "participants-section";

          const title = document.createElement("h5");
          title.textContent = `Participants (${details.participants.length})`;
          section.appendChild(title);

          const ul = document.createElement("ul");
          ul.className = "participants-list";

          details.participants.forEach((p) => {
            const li = document.createElement("li");
            li.className = "participant-item";
            const nameSpan = document.createElement("span");
            nameSpan.textContent = p;
            li.appendChild(nameSpan);

            const delBtn = document.createElement("button");
            delBtn.className = "participant-delete";
            delBtn.title = "Unregister participant";
            delBtn.setAttribute("data-activity", name);
            delBtn.setAttribute("data-email", p);
            delBtn.innerHTML = "✖";

            delBtn.addEventListener("click", async (e) => {
              e.stopPropagation();
              const activityName = delBtn.getAttribute("data-activity");
              const email = delBtn.getAttribute("data-email");
              try {
                const resp = await fetch(
                  `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`,
                  { method: "DELETE" }
                );

                const result = await resp.json();
                if (resp.ok) {
                  showMessage(result.message || "Removed participant", "success");
                  await fetchActivities();
                } else {
                  showMessage(result.detail || "Failed to remove participant", "error");
                }
              } catch (err) {
                console.error(err);
                showMessage("Failed to remove participant", "error");
              }
            });

            li.appendChild(delBtn);
            ul.appendChild(li);
          });

          section.appendChild(ul);
          participantsNode = section;
        } else {
          const pEmpty = document.createElement("p");
          pEmpty.className = "participants-empty";
          pEmpty.textContent = "No participants yet";
          participantsNode = pEmpty;
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description ?? "")}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule ?? "TBD")}</p>
          <p><strong>Availability:</strong> ${spotsLeft === Infinity ? "Unlimited" : escapeHtml(String(spotsLeft) + " spots left")}</p>
        `;

        activityCard.appendChild(participantsNode);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const activity = document.getElementById("activity").value;

    if (!activity) {
      showMessage("Please select an activity.", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message || "Signed up successfully.", "success");
        signupForm.reset();
        // Refresh activities list so availability and participants update immediately
        await fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      console.error("Error signing up:", error);
      showMessage("Failed to sign up. Please try again.", "error");
    }
  });

  // Initialize app
  fetchActivities();
});
