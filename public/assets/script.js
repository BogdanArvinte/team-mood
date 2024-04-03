const MOOD = {};

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
  const element = event.currentTarget;
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

function displayTeam(team) {
  document.querySelector("h2 .team").textContent = team;
}

function setTeam(team) {
  localStorage.setItem("team", team);
}

function getTeam() {
  return localStorage.getItem("team");
}

async function drawTeamStats(team) {
  const teamData = await getStatistics(team);
  const angerColor = getElementBackgroundColor(".anger.emote");
  const joyColor = getElementBackgroundColor(".joy.emote");
  const sadnessColor = getElementBackgroundColor(".sadness.emote");
  const exhaustionColor = getElementBackgroundColor(".exhaustion.emote");

  drawChart(
    MOOD.chart,
    parseTeamData(teamData, angerColor, joyColor, sadnessColor, exhaustionColor)
  );
}

async function saveEmote(event) {
  buttonRipple(event);
  const button = event.target;
  try {
    const team = getTeam();

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

    window.dispatchEvent(new CustomEvent("emote-update", { detail: { team } }));
  } catch {
    return;
  }
}

function showDialog() {
  const dialog = document.querySelector("dialog");
  dialog.removeEventListener("close", onDialogClose);
  dialog.addEventListener("close", onDialogClose);
  dialog.showModal();
}

function onDialogClose(event) {
  const dialog = event.target;
  const inputValue = dialog.querySelector("input").value;
  if (!inputValue) {
    return showDialog();
  }
  window.dispatchEvent(new CustomEvent("team-change", { detail: { team: inputValue } }));
}

function getElementBackgroundColor(selector) {
  let color = window.getComputedStyle(document.querySelector(selector)).backgroundColor;
  color = color.replace("rgb", "rgba").replace(")", ", 1)");
  return color;
}

function drawChart(chart, data) {
  if (!chart) {
    return new Chart("chart", {
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
    chart.data = data;
    chart.update();
    return chart;
  }
}

async function getStatistics(team) {
  if (!team) return;
  let result;

  try {
    const response = await fetch(`/emotes/${team}`).then((response) => response.json());
    if (response.statusCode && response.statusCode !== 200) {
      result = null;
      document.querySelector("h2 .error").hidden = false;
    } else {
      result = response;
      document.querySelector("h2 .error").hidden = true;
    }
  } catch (error) {
    result = null;
  }

  return result;
}

function parseTeamData(teamData, angerColor, joyColor, sadnessColor, exhaustionColor) {
  if (!teamData) {
    return;
  }

  let data = {
    labels: [],
    datasets: [
      { label: "Anger", data: [] },
      { label: "Joy", data: [] },
      { label: "Sadness", data: [] },
      { label: "Exhaustion", data: [] },
    ],
  };

  teamData.entries.forEach((entry) => {
    data.labels.push(entry.date);
    data.datasets[0].data.push(entry.anger);
    data.datasets[1].data.push(entry.joy);
    data.datasets[2].data.push(entry.sadness);
    data.datasets[3].data.push(entry.exhaustion);
  });

  data.datasets[0] = {
    ...data.datasets[0],
    borderColor: Array(data.datasets[0].data.length).fill(angerColor),
    backgroundColor: Array(data.datasets[0].data.length).fill(angerColor.replace(", 1)", ", 0.2)")),
  };
  data.datasets[1] = {
    ...data.datasets[1],
    borderColor: Array(data.datasets[1].data.length).fill(joyColor),
    backgroundColor: Array(data.datasets[1].data.length).fill(joyColor.replace(", 1)", ", 0.2)")),
  };
  data.datasets[2] = {
    ...data.datasets[2],
    borderColor: Array(data.datasets[2].data.length).fill(sadnessColor),
    backgroundColor: Array(data.datasets[2].data.length).fill(
      sadnessColor.replace(", 1)", ", 0.2)")
    ),
  };
  data.datasets[3] = {
    ...data.datasets[3],
    borderColor: Array(data.datasets[3].data.length).fill(exhaustionColor),
    backgroundColor: Array(data.datasets[3].data.length).fill(
      exhaustionColor.replace(", 1)", ", 0.2)")
    ),
  };

  return data;
}

async function init() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js");
  }

  const team = localStorage.getItem("team");

  if (!team) {
    showDialog();
  } else {
    displayTeam(team);
    drawTeamStats(team);
  }

  window.addEventListener("team-change", (event) => {
    const team = event.detail.team;
    displayTeam(team);
    setTeam(team);
    drawTeamStats(team);
  });

  window.addEventListener("emote-update", (event) => {
    const team = event.detail.team;
    drawTeamStats(team);
  });

  document.querySelectorAll(".emote").forEach((emote) => {
    emote.addEventListener("click", saveEmote);
  });

  document.querySelector("h2 .edit").addEventListener("click", showDialog);
}

init();
