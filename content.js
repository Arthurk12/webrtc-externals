console.log('Content script loaded');

const configs = {
  updateInterval: 1000,
  enabledStatsTypes: ['outbound-rtp', 'inbound-rtp']
}

const injectScript = (file_path) => {
  const head = document.querySelector('head');
  const script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('src', file_path);
  head.appendChild(script);
  console.log('Script injected');
};

setTimeout(() => injectScript(chrome.runtime.getURL('injected-script.js')));

const sendConfigs = () => {
  window.postMessage({
    name: 'webrtc-externals:configs',
    configs,
  })
}

window.addEventListener('message', async (event) => {
  const { name, id, pc, url, state, values } = event.data;
  if (!name) return;
  console.log('[webrtc-externals:content]', {event});
  if (name === 'webrtc-externals:injected') {
    sendConfigs();
  } else if (name === 'webrtc-externals:peer-connection-stats') {
    try{
      const response = await chrome.runtime.sendMessage({
        event: name,
        data: {
          url,
          id,
          state,
          values,
        }
      });
      if (response.error) {
        console.error(`[webrtc-externals:content] error: ${response.error}`);
      }
    } catch (error) {
      console.error(`[webrtc-externals:content] error: ${error.message}`);
    }
  } else if (name === 'webrtc-externals:new-peer-connection' || name === 'webrtc-externals:peer-connection-closed') {
    try{
      const response = await chrome.runtime.sendMessage({
        event: name,
        pc,
        id
      });
      if (response && response?.error) {
        console.error(`[webrtc-externals:content] error: ${response.error}`);
      }
    } catch (error) {
      console.error(`[webrtc-externals:content] error: ${error.message}`);
    }
  }
});

function redirectActionsToInjectedScript(message, sender, sendResponse) {
  const { action } = message;
  if (!action) return;
  sendResponse({error: false}); 
  window.postMessage({name: action});
};

chrome.runtime.onMessage.addListener(redirectActionsToInjectedScript);
