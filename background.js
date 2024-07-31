let intervalId = null;

let peerConnections = 0;
let notDownloadedData = false;

let collectedStats = {};

const formatCollectedData = (acc, item) => {
  const { id, type, ...stats } = item;
  if (!acc[id]) {
    acc[id] = {};
  }

  if (!acc[id][type]) {
    acc[id][type] = {};
  }
  
  Object.entries(stats).forEach(([stat, value]) => {
    if (!acc[id][type][stat]) {
      acc[id][type][stat] = [];
    }
    acc[id][type][stat].push(value);
  });

  return acc;
};

function downloadWebrtcDump(collectedStats) {
  const formattedData = JSON.stringify(collectedStats);
  const blob = new Blob([formattedData], { type: 'application/json' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `webrtc_dump_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();

  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  // console.log('Received message:', message, 'Sender:', sender, 'sendResponse', sendResponse);
  const { event, data } = message;
  
  if (event === 'webrtc-externals:peer-connection-stats') {
    notDownloadedData = true;
    sendResponse({});
    collectedStats = data.values.reduce(formatCollectedData, collectedStats);
  } else if (event === 'webrtc-externals:new-peer-connection') {
    peerConnections = peerConnections + 1;
    sendResponse({});
  } else if (event === 'webrtc-externals:peer-connection-closed') {
    peerConnections = peerConnections - 1;
    sendResponse({});
  } else if (event === 'webrtc-externals:status') {
    sendResponse({
      data: {
        areThereWebrtcPeerConnections: peerConnections > 0,
        notDownloadedData,
      }
    }); 
  } else if (event === 'webrtc-externals:download') {
    notDownloadedData = false;
    console.log({collectedStats});
    sendResponse({collectedStats});
    collectedStats = {};
  }
});
