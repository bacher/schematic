import {
  Assets,
  BoxSize,
  Element,
  ElementId,
  ElementType,
  ObjectType,
} from 'common/types';
import { getLiteralForSignal } from 'common/common';
import {
  elementsDescriptions,
  ICON_SIZE,
  FOCUS_SIZE,
  PIN_DOT_RADIUS,
} from 'common/data';
import { GameModelState } from 'models/GameModel';
import { getPinId, NodePowerState, PinId } from './simulation';

export function render(
  ctx: CanvasRenderingContext2D,
  {
    gameState,
    size,
    densityFactor,
    assets,
    tick,
  }: {
    gameState: GameModelState;
    size: BoxSize;
    densityFactor: number;
    assets: Assets;
    tick: number;
  },
) {
  const {
    pos,
    elements,
    connections,
    focusElement,
    hoverElement,
    wireElement,
    options,
    nodesSimulation,
  } = gameState;

  function getElById(elId: ElementId): Element {
    const el = elements.find((el) => el.id === elId);

    if (!el) {
      throw new Error(`Element ${elId} is not found`);
    }

    return el;
  }

  const simulationPins = new Map<PinId, NodePowerState>();

  if (nodesSimulation) {
    for (const node of nodesSimulation) {
      for (const pin of node.pins) {
        simulationPins.set(pin, node.state);
      }
    }
  }

  ctx.save();
  ctx.clearRect(0, 0, size.width * densityFactor, size.height * densityFactor);

  if (densityFactor !== 1) {
    ctx.scale(densityFactor, densityFactor);
  }

  ctx.translate(
    Math.floor(size.width / 2) + pos.x,
    Math.floor(size.height / 2) + pos.y,
  );

  if (options.debugDrawAxis) {
    ctx.save();

    ctx.lineWidth = 1;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(100, 0);
    ctx.moveTo(95, -5);
    ctx.lineTo(100, 0);
    ctx.moveTo(95, 5);
    ctx.lineTo(100, 0);
    ctx.strokeStyle = '#0f0';
    ctx.stroke();
    ctx.fillText('X', 90, 15);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 100);
    ctx.moveTo(-5, 95);
    ctx.lineTo(0, 100);
    ctx.moveTo(5, 95);
    ctx.lineTo(0, 100);
    ctx.strokeStyle = '#00f';
    ctx.stroke();
    ctx.fillText('Y', 12, 90);

    ctx.restore();
  }

  for (const element of elements) {
    const { pos } = element;

    const isHover =
      hoverElement &&
      hoverElement.type === ObjectType.ELEMENT &&
      element.id === hoverElement.elId;

    const isFocus =
      focusElement &&
      focusElement.type === ObjectType.ELEMENT &&
      focusElement.elId === element.id;

    if (isHover || isFocus) {
      ctx.save();

      if (isHover) {
        ctx.strokeStyle = isFocus ? '#7f7fff' : '#e5e5e5';
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = '#bebeff';
        ctx.lineWidth = 2;
      }

      ctx.strokeRect(
        pos.x - FOCUS_SIZE / 2,
        pos.y - FOCUS_SIZE / 2,
        FOCUS_SIZE,
        FOCUS_SIZE,
      );
      ctx.restore();
    }
  }

  let index = 0;
  for (const [p1, p2] of connections) {
    const el1 = getElById(p1.elId);
    const el2 = getElById(p2.elId);

    const nodeState = simulationPins.get(getPinId(p1));

    const pin1 = elementsDescriptions[el1.type].pins[p1.pinIndex];
    const pin2 = elementsDescriptions[el2.type].pins[p2.pinIndex];

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(
      el1.pos.x - ICON_SIZE / 2 + pin1.pos.x * ICON_SIZE,
      el1.pos.y - ICON_SIZE / 2 + pin1.pos.y * ICON_SIZE,
    );
    ctx.lineTo(
      el2.pos.x - ICON_SIZE / 2 + pin2.pos.x * ICON_SIZE,
      el2.pos.y - ICON_SIZE / 2 + pin2.pos.y * ICON_SIZE,
    );

    const isHovered =
      hoverElement &&
      hoverElement.type === ObjectType.CONNECTION &&
      hoverElement.connectionIndex === index;

    const isInFocus =
      focusElement &&
      focusElement.type === ObjectType.CONNECTION &&
      focusElement.connectionIndex === index;

    let lineWidth = 1;

    if (isHovered || isInFocus) {
      lineWidth = 3;
    } else if (nodeState === NodePowerState.SHORT_CIRCUIT) {
      lineWidth = 2;
    }

    let color = '#333';
    let drawDash = false;

    if (nodeState === NodePowerState.SHORT_CIRCUIT) {
      color = '#f00';
    } else if (nodeState === NodePowerState.POWER) {
      color = '#ff9038';
      drawDash = true;
    } else if (nodeState === NodePowerState.GROUND) {
      color = '#aaaaff';
      drawDash = true;
    } else if (isHovered && isInFocus) {
      color = '#8080ff';
    } else if (isInFocus) {
      color = '#bfbfff';
    }

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;

    if (drawDash && !isHovered) {
      ctx.setLineDash(tick % 2 ? [6, 6] : [0, 6, 6, 0]);
    }

    ctx.stroke();

    ctx.restore();

    index += 1;
  }

  if (wireElement) {
    const { elId, pinIndex } = wireElement;
    const el = getElById(elId);

    const { pos } = elementsDescriptions[el.type].pins[pinIndex];

    const x0 = pos.x * ICON_SIZE + el.pos.x - ICON_SIZE / 2;
    const y0 = pos.y * ICON_SIZE + el.pos.y - ICON_SIZE / 2;

    if (wireElement.pullPos) {
      const { x, y } = wireElement.pullPos;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#888';
      ctx.stroke();
      ctx.restore();
    }
  }

  for (const element of elements) {
    const { id, type, pos } = element;

    if (type === ElementType.INPUT || type === ElementType.OUTPUT) {
      const char = getLiteralForSignal(
        elements.filter((el) => el.type === type),
        element,
        type === ElementType.INPUT
          ? options.isInputVector
          : options.isOutputVector,
      );

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '24px sans-serif';
      if (type === ElementType.INPUT) {
        ctx.fillText(char, pos.x, pos.y - 10);
      } else {
        ctx.fillText(char, pos.x + 6, pos.y);
      }
      ctx.restore();
    } else {
      const [main, fallback]: ['x1', 'x2'] | ['x2', 'x1'] =
        densityFactor > 1.5 ? ['x2', 'x1'] : ['x1', 'x2'];

      const img = assets[main].images[type] ?? assets[fallback].images[type];

      if (img) {
        const x0 = pos.x - ICON_SIZE / 2;
        const y0 = pos.y - ICON_SIZE / 2;

        ctx.drawImage(img, x0, y0, ICON_SIZE, ICON_SIZE);
      }
    }

    if (options.debugDrawId) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '16px sans-serif';
      ctx.fillText(id, pos.x + ICON_SIZE / 2 - 6, pos.y - ICON_SIZE / 2 + 6);
    }

    const { pins } = elementsDescriptions[type];
    let i = 0;

    for (const pin of pins) {
      const isHovered =
        hoverElement &&
        hoverElement.type === ObjectType.PIN &&
        hoverElement.elId === element.id &&
        hoverElement.pinIndex === i;

      const isWire =
        wireElement &&
        wireElement.elId === element.id &&
        wireElement.pinIndex === i;

      ctx.beginPath();
      ctx.arc(
        pos.x + (pin.pos.x - 0.5) * ICON_SIZE,
        pos.y + (pin.pos.y - 0.5) * ICON_SIZE,
        isHovered ? PIN_DOT_RADIUS + 1 : PIN_DOT_RADIUS,
        0,
        Math.PI * 2,
      );
      ctx.closePath();

      if (isHovered || isWire) {
        ctx.save();
        ctx.fillStyle = isWire ? '#d66' : '#66d';
        ctx.fill();
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#448';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
      i += 1;
    }
  }

  ctx.restore();
}
