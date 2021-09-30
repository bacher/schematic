// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable no-console */

import {
  Connection,
  ConnectionPin,
  Element,
  ElementId,
  ElementType,
} from 'common/types';

type PinId = `${ElementId}:${number}`;

type Zone = PinId[];

enum ZonePowerState {
  IMPEDANCE,
  GROUND,
  POWER,
}

type ZoneState = {
  state: ZonePowerState;
  pins: PinId[];
};

function getPinId(p: ConnectionPin): PinId {
  return `${p.elId}:${p.pinIndex}`;
}

export function drawSimulation(
  ctx: CanvasRenderingContext2D,
  {
    elements,
    connections,
    inputSignals,
  }: {
    elements: Element[];
    connections: Connection[];
    inputSignals: boolean[];
  },
) {
  function getElement(pinId: PinId): Element {
    const elId = pinId.split(':')[0];

    const element = elements.find(({ id }) => id === elId);

    if (!element) {
      throw new Error('No element');
    }

    return element;
  }

  function buildZonesState(zones: ZoneState[]) {
    const pinIdToZone = new Map<PinId, ZoneState | undefined>();

    for (const zone of zones) {
      for (const pin of zone.pins) {
        pinIdToZone.set(pin, zone);
      }
    }

    let hasChanges = true;

    function setZoneState(zone: ZoneState, state: ZonePowerState): void {
      if (
        state === ZonePowerState.POWER &&
        zone.state === ZonePowerState.GROUND
      ) {
        console.log(`Short circuit between: ${zone.pins}`);
        throw new Error('Short circuit');
      }

      if (
        state === ZonePowerState.GROUND &&
        zone.state === ZonePowerState.POWER
      ) {
        console.log(`Short circuit between: ${zone.pins}`);
        throw new Error('Short circuit');
      }

      if (zone.state !== state) {
        // eslint-disable-next-line no-param-reassign
        zone.state = state;
        hasChanges = true;
      } else {
        hasChanges = false;
      }
    }

    while (hasChanges) {
      hasChanges = false;

      for (const zone of zones) {
        for (const pin of zone.pins) {
          const element = getElement(pin);

          switch (element.type) {
            case ElementType.INPUT: {
              const inputIndex = inputElements.indexOf(element);
              const value = inputSignals[inputIndex];
              setZoneState(
                zone,
                value ? ZonePowerState.POWER : ZonePowerState.GROUND,
              );
              break;
            }
            case ElementType.POWER:
              setZoneState(zone, ZonePowerState.POWER);
              break;
            case ElementType.GROUND:
              setZoneState(zone, ZonePowerState.GROUND);
              break;
            case ElementType.NPN: {
              // Maybe I should iterate over elements instead of zones?
              const pin1Zone = pinIdToZone.get(`${element.id}:0`);
              const pin2Zone = pinIdToZone.get(`${element.id}:1`);
              const pin3Zone = pinIdToZone.get(`${element.id}:2`);

              if (
                pin1Zone &&
                pin1Zone.state === ZonePowerState.GROUND &&
                pin2Zone &&
                pin2Zone.state === ZonePowerState.POWER &&
                pin3Zone
              ) {
                setZoneState(pin3Zone, ZonePowerState.POWER);
              }
              break;
            }
            case ElementType.PNP: {
              // Maybe I should iterate over elements instead of zones?
              const pin1Zone = pinIdToZone.get(`${element.id}:0`);
              const pin2Zone = pinIdToZone.get(`${element.id}:1`);
              const pin3Zone = pinIdToZone.get(`${element.id}:2`);

              if (
                pin1Zone &&
                pin1Zone.state === ZonePowerState.POWER &&
                pin2Zone &&
                pin2Zone.state === ZonePowerState.GROUND &&
                pin3Zone
              ) {
                setZoneState(pin3Zone, ZonePowerState.GROUND);
              }
              break;
            }
          }
        }
      }
      break;
    }
  }

  ctx.save();

  const inputElements = elements.filter((el) => el.type === ElementType.INPUT);
  const pinIdToZones = new Map<PinId, Zone>();
  const zones = new Set<Zone>();

  for (const [p1, p2] of connections) {
    const pinId1 = getPinId(p1);
    const pinId2 = getPinId(p2);

    const zone1 = pinIdToZones.get(pinId1);
    const zone2 = pinIdToZones.get(pinId2);

    if (zone1 && zone2) {
      const mergedZone = [...zone1, ...zone2];

      zones.delete(zone1);
      zones.delete(zone2);
      zones.add(mergedZone);

      for (const pinId of mergedZone) {
        pinIdToZones.set(pinId, mergedZone);
      }
    } else if (zone1) {
      zone1.push(pinId2);
      pinIdToZones.set(pinId2, zone1);
    } else if (zone2) {
      zone2.push(pinId1);
      pinIdToZones.set(pinId1, zone2);
    } else {
      const zone = [pinId1, pinId2];
      zones.add(zone);
      pinIdToZones.set(pinId1, zone);
      pinIdToZones.set(pinId2, zone);
    }
  }

  const zonesList = [...zones.values()].map((pins) => ({
    state: ZonePowerState.IMPEDANCE,
    pins,
  }));

  try {
    buildZonesState(zonesList);
    console.log(zonesList);
  } catch (error) {
    console.warn(error);
  }

  ctx.restore();
}
