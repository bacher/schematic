import {
  Connection,
  ConnectionPin,
  Element,
  ElementId,
  ElementType,
} from 'common/types';

type PinId = `${ElementId}:${number}`;

type Node = PinId[];

enum NodePowerState {
  IMPEDANCE,
  GROUND,
  POWER,
  SHORT_CIRCUIT,
}

export type NodeState = {
  state: NodePowerState;
  pins: PinId[];
};

function getPinId(p: ConnectionPin): PinId {
  return `${p.elId}:${p.pinIndex}`;
}

export function getNodesSimulationState({
  elements,
  connections,
  inputSignals,
}: {
  elements: Element[];
  connections: Connection[];
  inputSignals: boolean[];
}): NodeState[] {
  let isShortCircuit = false;

  function getElement(pinId: PinId): Element {
    const elId = pinId.split(':')[0];

    const element = elements.find(({ id }) => id === elId);

    if (!element) {
      throw new Error('No element');
    }

    return element;
  }

  function buildNodesState(nodes: NodeState[]) {
    const pinIdToNode = new Map<PinId, NodeState | undefined>();

    for (const node of nodes) {
      for (const pin of node.pins) {
        pinIdToNode.set(pin, node);
      }
    }

    let hasChanges = true;

    function setZoneState(node: NodeState, state: NodePowerState): void {
      if (
        state === NodePowerState.POWER &&
        node.state === NodePowerState.GROUND
      ) {
        isShortCircuit = true;
        // eslint-disable-next-line no-param-reassign
        node.state = NodePowerState.SHORT_CIRCUIT;
        return;
      }

      if (
        state === NodePowerState.GROUND &&
        node.state === NodePowerState.POWER
      ) {
        isShortCircuit = true;
        // eslint-disable-next-line no-param-reassign
        node.state = NodePowerState.SHORT_CIRCUIT;
        return;
      }

      if (node.state !== state) {
        // eslint-disable-next-line no-param-reassign
        node.state = state;
        hasChanges = true;
      } else {
        hasChanges = false;
      }
    }

    while (hasChanges) {
      hasChanges = false;

      for (const node of nodes) {
        for (const pin of node.pins) {
          const element = getElement(pin);

          switch (element.type) {
            case ElementType.INPUT: {
              const inputIndex = inputElements.indexOf(element);
              const value = inputSignals[inputIndex];
              setZoneState(
                node,
                value ? NodePowerState.POWER : NodePowerState.GROUND,
              );
              break;
            }
            case ElementType.POWER:
              setZoneState(node, NodePowerState.POWER);
              break;
            case ElementType.GROUND:
              setZoneState(node, NodePowerState.GROUND);
              break;
            case ElementType.NPN: {
              // Maybe I should iterate over elements instead of zones?
              const pin1Zone = pinIdToNode.get(`${element.id}:0`);
              const pin2Zone = pinIdToNode.get(`${element.id}:1`);
              const pin3Zone = pinIdToNode.get(`${element.id}:2`);

              if (
                pin1Zone &&
                pin1Zone.state === NodePowerState.GROUND &&
                pin2Zone &&
                pin2Zone.state === NodePowerState.POWER &&
                pin3Zone
              ) {
                setZoneState(pin3Zone, NodePowerState.POWER);
              }
              break;
            }
            case ElementType.PNP: {
              // Maybe I should iterate over elements instead of zones?
              const pin1Zone = pinIdToNode.get(`${element.id}:0`);
              const pin2Zone = pinIdToNode.get(`${element.id}:1`);
              const pin3Zone = pinIdToNode.get(`${element.id}:2`);

              if (
                pin1Zone &&
                pin1Zone.state === NodePowerState.POWER &&
                pin2Zone &&
                pin2Zone.state === NodePowerState.GROUND &&
                pin3Zone
              ) {
                setZoneState(pin3Zone, NodePowerState.GROUND);
              }
              break;
            }
          }

          if (isShortCircuit) {
            return;
          }
        }
      }
      break;
    }
  }

  const inputElements = elements.filter((el) => el.type === ElementType.INPUT);
  const pinIdToNodes = new Map<PinId, Node>();
  const nodes = new Set<Node>();

  for (const [p1, p2] of connections) {
    const pinId1 = getPinId(p1);
    const pinId2 = getPinId(p2);

    const node1 = pinIdToNodes.get(pinId1);
    const node2 = pinIdToNodes.get(pinId2);

    if (node1 && node2) {
      const mergedNode = [...node1, ...node2];

      nodes.delete(node1);
      nodes.delete(node2);
      nodes.add(mergedNode);

      for (const pinId of mergedNode) {
        pinIdToNodes.set(pinId, mergedNode);
      }
    } else if (node1) {
      node1.push(pinId2);
      pinIdToNodes.set(pinId2, node1);
    } else if (node2) {
      node2.push(pinId1);
      pinIdToNodes.set(pinId1, node2);
    } else {
      const node = [pinId1, pinId2];
      nodes.add(node);
      pinIdToNodes.set(pinId1, node);
      pinIdToNodes.set(pinId2, node);
    }
  }

  const nodesList = [...nodes.values()].map((pins) => ({
    state: NodePowerState.IMPEDANCE,
    pins,
  }));

  buildNodesState(nodesList);

  return nodesList;
}
