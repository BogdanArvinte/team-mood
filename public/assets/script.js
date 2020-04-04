function getFormattedDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buttonRipple(event) {
  const existingRipple = document.querySelector(".ripple");
  if (existingRipple) {
    existingRipple.remove();
  }
  let position;
  const element = event.path.shift();
  const elementColor = window.getComputedStyle(element).backgroundColor;
  if (event.type === "keydown") {
    const clientRect = element.getClientRects()[0];
    position = {
      x: clientRect.x + clientRect.width / 2,
      y: clientRect.y + clientRect.height / 2,
    };
  } else {
    position = { x: event.clientX, y: event.clientY };
  }
  const ripple = document.createElement("div");
  ripple.classList.add("ripple");
  ripple.style.backgroundColor = elementColor;
  ripple.style.left = `${position.x}px`;
  ripple.style.top = `${position.y}px`;
  document.body.appendChild(ripple);
}

function getTeam() {
  let team = localStorage.getItem("team");

  return new Promise((resolve, reject) => {
    if (!team) {
      const dialog = document.querySelector("dialog");
      dialogPolyfill.registerDialog(dialog);
      if (!dialog.dataset.init) {
        dialog.addEventListener("close", (event) => {
          team = event.target.querySelector("[name=team]").value;
          if (!team) reject();
          localStorage.setItem("team", team);
          document.querySelector("h2").textContent = team;
          resolve(team);
        });
      }
      dialog.dataset.init = true;
      dialog.showModal();
    } else {
      resolve(team);
    }
  });
}

async function saveEmote(event) {
  if (event.type === "keydown" && event.code !== "Space") return;
  buttonRipple(event);
  const button = event.target;
  try {
    const team = await getTeam();

    await fetch(`/emotes/${team}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        date: getFormattedDate(),
        emote: button.dataset.emote,
      }),
    });

    window.dispatchEvent(new CustomEvent("emote-added"));
  } catch {
    return;
  }
}

function getElementBackgroundColor(selector) {
  let color = window.getComputedStyle(document.querySelector(selector))
    .backgroundColor;
  color = color.replace("rgb", "rgba").replace(")", ", 1)");
  return color;
}

function drawChart(chart = null, data) {
  let _chart;

  if (!chart) {
    _chart = new Chart("chart", {
      type: "line",
      data,
      options: {
        scales: {
          yAxes: [
            {
              ticks: {
                beginAtZero: true,
              },
            },
          ],
        },
      },
    });
  } else {
    _chart = chart;
    _chart.data = data;
    _chart.update();
  }

  return _chart;
}

async function getStatistics(team) {
  if (!team) return;

  return fetch(`/emotes/${team}`).then((response) => response.json());
}

function parseTeamData(teamData, angerColor, joyColor, sadnessColor) {
  let data = {
    labels: [],
    datasets: [
      { label: "Anger", data: [] },
      { label: "Joy", data: [] },
      { label: "Sadness", data: [] },
    ],
  };

  teamData.entries.forEach((entry) => {
    data.labels.push(entry.date);
    data.datasets[0].data.push(entry.anger);
    data.datasets[1].data.push(entry.joy);
    data.datasets[2].data.push(entry.sadness);
  });

  data.datasets[0] = {
    ...data.datasets[0],
    borderColor: Array(data.datasets[0].data.length).fill(angerColor),
    backgroundColor: Array(data.datasets[0].data.length).fill(
      angerColor.replace(", 1)", ", 0.2)")
    ),
  };
  data.datasets[1] = {
    ...data.datasets[1],
    borderColor: Array(data.datasets[1].data.length).fill(joyColor),
    backgroundColor: Array(data.datasets[1].data.length).fill(
      joyColor.replace(", 1)", ", 0.2)")
    ),
  };
  data.datasets[2] = {
    ...data.datasets[2],
    borderColor: Array(data.datasets[2].data.length).fill(sadnessColor),
    backgroundColor: Array(data.datasets[2].data.length).fill(
      sadnessColor.replace(", 1)", ", 0.2)")
    ),
  };

  return data;
}

async function init() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js");
  }

  const team = await getTeam();
  document.querySelector("h2").textContent = team;

  document.querySelectorAll(".emote").forEach((emote) => {
    emote.addEventListener("mousedown", saveEmote);
    emote.addEventListener("keydown", saveEmote);
  });

  if (!team) returm;

  const teamData = await getStatistics(team);
  const angerColor = getElementBackgroundColor(".anger.emote");
  const joyColor = getElementBackgroundColor(".joy.emote");
  const sadnessColor = getElementBackgroundColor(".sadness.emote");

  const chart = drawChart(
    null,
    parseTeamData(teamData, angerColor, joyColor, sadnessColor)
  );

  window.addEventListener("emote-added", async () => {
    const teamData = await getStatistics(team);
    drawChart(
      chart,
      parseTeamData(teamData, angerColor, joyColor, sadnessColor)
    );
  });
}

init();
