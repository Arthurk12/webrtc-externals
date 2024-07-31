function downloadWebrtcDump(groupedData) {
  // Format the data similar to the WebRTC internals dump
  const formattedData = JSON.stringify(groupedData, null, 2);

  // Create a Blob from the formatted data
  const blob = new Blob([formattedData], { type: 'application/json' });

  // Create a temporary anchor element to trigger the download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `webrtc_dump_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();

  // Clean up by revoking the object URL and removing the anchor element
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

function initialButtonStates() {
  document.getElementById('startCapture').disabled = true;
  document.getElementById('stopCapture').disabled = true;
  document.getElementById('downloadData').disabled = true;
}

function capturingDataButtonStates() {
  document.getElementById('startCapture').disabled = true;
  document.getElementById('stopCapture').disabled = false;
  document.getElementById('downloadData').disabled = true;
}

function stoppingDataButtonStates() {
  document.getElementById('startCapture').disabled = false;
  document.getElementById('stopCapture').disabled = true;
  document.getElementById('downloadData').disabled = false;
}

// Event listeners for buttons
document.getElementById('startCapture').addEventListener('click', async () => {
  const response = await chrome.runtime.sendMessage({event: 'webrtc-externals:status'});
  if (response.data.notDownloadedData) {
    //there is collected webrtc data that was not yet downloaded
    //raise a warning about this before proceeding
    return;
  }
  if (!response.data.areThereWebrtcPeerConnections) {
    document.getElementById('startCapture').disabled = true;
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'webrtc-externals:start'}, (response) => {
      if(!response || response.error) {
        console.error(`Receiver did not responded to message`);
        return;
      }
      capturingDataButtonStates();
    });
  });
});

document.getElementById('stopCapture').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'webrtc-externals:stop'}, (response) => {
      if(!response || response.error) {
        console.error(`Receiver did not responded to message`);
        return;
      }
      stoppingDataButtonStates();
    });
  });
});

document.getElementById('downloadData').addEventListener('click', async () => {
  const response = await chrome.runtime.sendMessage({ event: 'webrtc-externals:download' });
  if (response.error) {
    console.error(`Error requesting webrtc data to download`);
    return;
  }
  downloadWebrtcDump(response.collectedStats);
});

// Call updateButtonStates when popup is opened
document.addEventListener('DOMContentLoaded', () => {
  initialButtonStates();
  chrome.runtime.sendMessage({ event: 'webrtc-externals:status' }, (response) => {
    if (response && response.data?.areThereWebrtcPeerConnections) {
      document.getElementById('startCapture').disabled = false;
    }
  })
});
