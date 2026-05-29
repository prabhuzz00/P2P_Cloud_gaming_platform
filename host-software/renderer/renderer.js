const state = {
          settings: null,
          games: [],
          hostStatus: null,
          logTimer: null,
          statusTimer: null,
          unsubscribeStatus: null,
        };

        const elements = {
          tabs: Array.from(document.querySelectorAll('.tab-button')),
          panels: Array.from(document.querySelectorAll('.tab-panel')),
          hostId: document.getElementById('hostId'),
          statusDot: document.getElementById('statusDot'),
          statusText: document.getElementById('statusText'),
          signalingText: document.getElementById('signalingText'),
          currentGameText: document.getElementById('currentGameText'),
          portRangeText: document.getElementById('portRangeText'),
          portForwardNote: document.getElementById('portForwardNote'),
          availabilityToggle: document.getElementById('availabilityToggle'),
          stopGameButton: document.getElementById('stopGameButton'),
          refreshQrButton: document.getElementById('refreshQrButton'),
          qrCodeImage: document.getElementById('qrCodeImage'),
          qrMeta: document.getElementById('qrMeta'),
          connectedClients: document.getElementById('connectedClients'),
          clientCountBadge: document.getElementById('clientCountBadge'),
          addGameButton: document.getElementById('addGameButton'),
          gamesList: document.getElementById('gamesList'),
          settingsForm: document.getElementById('settingsForm'),
          resolution: document.getElementById('resolution'),
          bandwidth: document.getElementById('bandwidth'),
          bandwidthValue: document.getElementById('bandwidthValue'),
          portStart: document.getElementById('portStart'),
          portEnd: document.getElementById('portEnd'),
          autoStart: document.getElementById('autoStart'),
          serverUrl: document.getElementById('serverUrl'),
          refreshLogsButton: document.getElementById('refreshLogsButton'),
          logsOutput: document.getElementById('logsOutput'),
          toast: document.getElementById('toast'),
        };

        function showToast(message, isError = false) {
          elements.toast.textContent = message;
          elements.toast.classList.remove('hidden');
          elements.toast.style.borderColor = isError ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.4)';
          clearTimeout(showToast.timeoutId);
          showToast.timeoutId = setTimeout(() => elements.toast.classList.add('hidden'), 2600);
        }

        function switchTab(targetTab) {
          elements.tabs.forEach((button) => button.classList.toggle('active', button.dataset.tab === targetTab));
          elements.panels.forEach((panel) => panel.classList.toggle('active', panel.id === targetTab));
        }

        function bindTabs() {
          elements.tabs.forEach((button) => {
            button.addEventListener('click', () => switchTab(button.dataset.tab));
          });
        }

        function updateBandwidthLabel() {
          elements.bandwidthValue.textContent = `${elements.bandwidth.value} Mbps`;
        }

        async function loadSettings() {
          state.settings = await window.hostAPI.getSettings();
          elements.resolution.value = state.settings.resolution;
          elements.bandwidth.value = state.settings.bandwidth;
          elements.portStart.value = state.settings.portRange.start;
          elements.portEnd.value = state.settings.portRange.end;
          elements.autoStart.checked = Boolean(state.settings.autoStart);
          elements.serverUrl.value = state.settings.serverUrl;
          updateBandwidthLabel();
        }

        function renderGames() {
          if (!state.games.length) {
            elements.gamesList.innerHTML = '<div class="card"><p class="muted-text">No games added yet. Use <strong>Add Game</strong> to register an executable.</p></div>';
            return;
          }

          elements.gamesList.innerHTML = state.games.map((game) => `
            <article class="game-card">
              <div class="game-icon">🎮</div>
              <h3>${game.name}</h3>
              <p class="muted-text">${game.exePath}</p>
              <div class="game-actions">
                <button class="primary-button" data-action="start" data-id="${game.id}">Start</button>
                <button class="secondary-button" data-action="remove" data-id="${game.id}">Remove</button>
              </div>
            </article>
          `).join('');
        }

        async function loadGames() {
          state.games = await window.hostAPI.getGames();
          renderGames();
        }

        function renderClients(clients = []) {
          elements.clientCountBadge.textContent = String(clients.length);
          elements.connectedClients.innerHTML = clients.length
            ? clients.map((clientId) => `<li>${clientId}</li>`).join('')
            : '<li class="muted-text">No connected clients.</li>';
        }

        async function loadQRCode() {
          const qr = await window.hostAPI.getQRCode();
          elements.qrCodeImage.src = qr.dataUrl;
          elements.qrMeta.textContent = `Token: ${qr.payload.pairingToken.slice(0, 8)}… | ${new Date(qr.payload.timestamp).toLocaleTimeString()}`;
        }

        function renderStatus(status) {
          state.hostStatus = status;
          const online = Boolean(status?.online);
          elements.hostId.textContent = status?.hostId ? `Host ID: ${status.hostId}` : 'Host not registered yet';
          elements.statusDot.classList.toggle('online', online);
          elements.statusDot.classList.toggle('offline', !online);
          elements.statusText.textContent = online ? 'Online' : 'Offline';
          elements.signalingText.textContent = status?.signalingConnected ? 'Connected' : 'Disconnected';
          elements.currentGameText.textContent = status?.currentGame?.name || 'None';
          elements.availabilityToggle.textContent = status?.available ? 'Set Unavailable' : 'Set Available';
          elements.stopGameButton.disabled = !status?.currentGame;

          if (status?.portRange) {
            elements.portRangeText.textContent = `${status.portRange.start} - ${status.portRange.end} (UDP/TCP)`;
            elements.portForwardNote.classList.remove('hidden');
          } else {
            elements.portRangeText.textContent = 'Not configured';
            elements.portForwardNote.classList.add('hidden');
          }

          renderClients(status?.connectedClients || []);
        }

        async function loadStatus() {
          const status = await window.hostAPI.getHostStatus();
          renderStatus(status);
        }

        async function loadLogs() {
          const logs = await window.hostAPI.getLogs();
          elements.logsOutput.textContent = logs.length ? logs.join('\n') : 'No log entries yet.';
        }

        function bindSettingsForm() {
          elements.bandwidth.addEventListener('input', updateBandwidthLabel);
          elements.settingsForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            try {
              const portStart = Number(elements.portStart.value);
              const portEnd = Number(elements.portEnd.value);

              if (portStart < 1 || portStart > 65535 || portEnd < 1 || portEnd > 65535) {
                showToast('Port values must be between 1 and 65535.', true);
                return;
              }
              if (portEnd <= portStart) {
                showToast('Port Range End must be greater than Port Range Start.', true);
                return;
              }

              const saved = await window.hostAPI.saveSettings({
                resolution: elements.resolution.value,
                bandwidth: Number(elements.bandwidth.value),
                portRange: {
                  start: portStart,
                  end: portEnd,
                },
                autoStart: elements.autoStart.checked,
                serverUrl: elements.serverUrl.value.trim(),
              });
              state.settings = saved;
              showToast(`Settings saved successfully. Remember to forward ports ${portStart}-${portEnd} on your router.`);
              await Promise.all([loadStatus(), loadQRCode(), loadLogs()]);
            } catch (error) {
              showToast(`Failed to save settings: ${error.message}`, true);
            }
          });
        }

        function bindStatusActions() {
          elements.refreshQrButton.addEventListener('click', async () => {
            try {
              await loadQRCode();
              showToast('Pairing QR refreshed.');
            } catch (error) {
              showToast(`Failed to refresh QR: ${error.message}`, true);
            }
          });

          elements.availabilityToggle.addEventListener('click', async () => {
            try {
              const nextStatus = await window.hostAPI.setAvailability(!state.hostStatus?.available);
              renderStatus(nextStatus);
              showToast(`Host marked as ${nextStatus.available ? 'available' : 'unavailable'}.`);
            } catch (error) {
              showToast(`Failed to update availability: ${error.message}`, true);
            }
          });

          elements.stopGameButton.addEventListener('click', async () => {
            try {
              await window.hostAPI.stopGame();
              await Promise.all([loadStatus(), loadLogs()]);
              showToast('Stop signal sent to active game.');
            } catch (error) {
              showToast(`Failed to stop game: ${error.message}`, true);
            }
          });
        }

        function bindGameActions() {
          elements.addGameButton.addEventListener('click', async () => {
            try {
              const game = await window.hostAPI.pickGameFile();
              if (!game) {
                return;
              }
              await window.hostAPI.addGame(game);
              await Promise.all([loadGames(), loadLogs()]);
              showToast(`Added ${game.name}.`);
            } catch (error) {
              showToast(`Failed to add game: ${error.message}`, true);
            }
          });

          elements.gamesList.addEventListener('click', async (event) => {
            const button = event.target.closest('button[data-action]');
            if (!button) {
              return;
            }

            const gameId = button.dataset.id;
            const action = button.dataset.action;

            try {
              if (action === 'remove') {
                await window.hostAPI.removeGame(gameId);
                await Promise.all([loadGames(), loadLogs()]);
                showToast('Game removed.');
              }

              if (action === 'start') {
                await window.hostAPI.startGame(gameId);
                await Promise.all([loadStatus(), loadLogs()]);
                showToast('Game launch requested.');
              }
            } catch (error) {
              showToast(`Action failed: ${error.message}`, true);
            }
          });
        }

        function bindLogActions() {
          elements.refreshLogsButton.addEventListener('click', async () => {
            try {
              await loadLogs();
              showToast('Logs refreshed.');
            } catch (error) {
              showToast(`Failed to load logs: ${error.message}`, true);
            }
          });
        }

        async function initialize() {
          try {
            bindTabs();
            bindSettingsForm();
            bindStatusActions();
            bindGameActions();
            bindLogActions();

            state.unsubscribeStatus = window.hostAPI.onHostStatusUpdated(renderStatus);

            await Promise.all([loadSettings(), loadGames(), loadStatus(), loadQRCode(), loadLogs()]);
            state.statusTimer = setInterval(loadStatus, 10000);
            state.logTimer = setInterval(loadLogs, 15000);
          } catch (error) {
            showToast(`Failed to initialize UI: ${error.message}`, true);
          }
        }

        window.addEventListener('beforeunload', () => {
          if (state.unsubscribeStatus) {
            state.unsubscribeStatus();
          }
          clearInterval(state.statusTimer);
          clearInterval(state.logTimer);
        });

        initialize();
