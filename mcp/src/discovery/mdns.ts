import { Bonjour, Service } from 'bonjour-service';
import { DiscoveryConfig } from '../utils/types.js';

export class MDNSDiscovery {
  private bonjour: Bonjour | null = null;
  private service: Service | null = null;
  private services: Map<string, Service> = new Map();

  private onDiscoveredCallback?: (service: Service) => void;
  private onRemovedCallback?: (service: Service) => void;

  async start(config: DiscoveryConfig, onDiscovered?: (service: Service) => void, onRemoved?: (service: Service) => void): Promise<void> {
    this.onDiscoveredCallback = onDiscovered;
    this.onRemovedCallback = onRemoved;
    console.error(`Starting mDNS discovery service for type: _${config.serviceName}._${config.protocol || 'tcp'}`);

    try {
      this.bonjour = new Bonjour();

      /**
       * We browse for the service type provided in config.
       * Note: bonjour-service automatically prepends '_' and appends '._tcp' or '._udp'
       */
      const browser = this.bonjour.find({ type: config.serviceName, protocol: config.protocol || 'tcp' });

      browser.on('up', (service: Service) => {
        console.error(`Display discovered: ${service.name} at ${service.addresses?.[0]}:${service.port}`);
        this.services.set(service.name, service);
        this.onDiscoveredCallback?.(service);
      });

      browser.on('down', (service: Service) => {
        console.error(`Display removed: ${service.name}`);
        this.services.delete(service.name);
        this.onRemovedCallback?.(service);
      });

      console.error(`mDNS discovery active for type: ${config.serviceName}`);
    } catch (error) {
      console.error('Failed to start mDNS discovery:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.bonjour) {
      this.bonjour.destroy();
    }
    this.services.clear();
    console.error('mDNS discovery stopped');
  }

  getServices(): Service[] {
    return Array.from(this.services.values());
  }
}
