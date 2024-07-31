class WebrtcExternals {
  peerConnections = new Map();

  updateInterval = 1000;
  enabledStatsTypes = [];
  stopSignal = false;

  constructor() {
    window.addEventListener('message', async (event) => {
      const { name, configs } = event.data;
      if (name === 'webrtc-externals:configs') {
        WebrtcExternals.log(`Configs received!`);
        Object.assign(this, configs);
      } else if (name === 'webrtc-externals:start') {
        WebrtcExternals.log(`Starting webrtc capture!`)
        this.stopSignal = false;
        this.collectStats();
      } else if (name === 'webrtc-externals:stop') {
        WebrtcExternals.log(`Stoping webrtc capture!`);
        this.stopSignal = true;
      }
    });

    window.postMessage({ name: 'webrtc-externals:injected' });
  }

  static log(...args) {
    console.log.apply(null, ['[webrtc-externals:injected-script]', ...args]);
  }

  static randomId() {
    if ('randomUUID' in window.crypto) {
      return window.crypto.randomUUID();
    } else {
      return (2 ** 64 * Math.random()).toString(16);
    }
  }

  add(pc) {
    const id = WebrtcExternals.randomId();
    this.peerConnections.set(id, pc);
    window.postMessage({
      name: 'webrtc-externals:new-peer-connection',
      id,
    });
    pc.addEventListener('connectionstatechange', () => {
      if (pc.connectionState === 'closed') {
        this.peerConnections.delete(id);
        window.postMessage({
          name: 'webrtc-externals:peer-connection-closed',
          id,
        });
      }
    });
  }

  async collectStats() {
    WebrtcExternals.log(`starting capture of all peer connections`, this.peerConnections);
    this.peerConnections.forEach(async (pc, id) => {
      if (!pc) return;
  
      try {
        const stats = await pc.getStats();
        const values = [...stats.values()].filter(
          (v) =>
            ['peer-connection', ...this.enabledStatsTypes].indexOf(v.type) !== -1,
        );
        window.postMessage(
          {
            name: 'webrtc-externals:peer-connection-stats',
            url: window.location.href,
            id,
            state: pc.connectionState,
            values,
          },
          [values],
        );
      } catch (error) {
        WebrtcExternals.log(`collectStats error: ${error.message}`);
      }
  
      if (pc.connectionState === 'closed') {
        this.peerConnections.delete(id);
      } else if (!this.stopSignal) {
        setTimeout(this.collectStats.bind(this), this.updateInterval);
      } else {
        WebrtcExternals.log(`Stopping stats gathering because of signal stop`);
      }
    });
  }
}

const webrtcExternals = new WebrtcExternals();

window.RTCPeerConnection = new Proxy(window.RTCPeerConnection, {
  construct(target, argumentsList) {
    WebrtcExternals.log(`RTCPeerConnection`, argumentsList);

    const pc = new target(...argumentsList);

    webrtcExternals.add(pc);

    return pc;
  },
});
