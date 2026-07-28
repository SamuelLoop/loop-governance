import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import type { Tier } from '../types';
import { tierColors } from '../utils/tier';

interface TreeNode {
  id: string;
  displayName: string;
  tier: Tier;
}

interface Props {
  upstream: TreeNode[];
  downstream: TreeNode[];
  centerTier: Tier;
  totalUpstream: number;
  totalDownstream: number;
}

const W = 260;
const H = 160;
const CX = W / 2;
const CY = H / 2;
const NODE_R = 10;
const CENTER_R = 14;
const NODE_SPACING = 38;
const UP_Y = CY - 52;
const DOWN_Y = CY + 52;

function nodeXPositions(count: number): number[] {
  return Array.from({ length: count }, (_, i) => {
    return CX + (i - (count - 1) / 2) * NODE_SPACING;
  });
}

export function PowerTreeMini({
  upstream,
  downstream,
  centerTier,
  totalUpstream,
  totalDownstream,
}: Props) {
  const centerColor = tierColors[centerTier];
  const upNodes = upstream.slice(0, 5);
  const downNodes = downstream.slice(0, 4);
  const upXs = nodeXPositions(upNodes.length);
  const downXs = nodeXPositions(downNodes.length);

  return (
    <View>
      <Svg width={W} height={H}>
        {upXs.map((x, i) => (
          <Line
            key={`ul${i}`}
            x1={x}
            y1={UP_Y + NODE_R}
            x2={CX}
            y2={CY - CENTER_R}
            stroke="#2a2a2a"
            strokeWidth={1}
          />
        ))}
        {downXs.map((x, i) => (
          <Line
            key={`dl${i}`}
            x1={CX}
            y1={CY + CENTER_R}
            x2={x}
            y2={DOWN_Y - NODE_R}
            stroke="#2a2a2a"
            strokeWidth={1}
          />
        ))}
        {upNodes.map((node, i) => (
          <Circle
            key={node.id}
            cx={upXs[i]}
            cy={UP_Y}
            r={NODE_R}
            fill={tierColors[node.tier]}
            opacity={0.6}
          />
        ))}
        <Circle cx={CX} cy={CY} r={CENTER_R} fill={centerColor} />
        {downNodes.map((node, i) => (
          <Circle
            key={node.id}
            cx={downXs[i]}
            cy={DOWN_Y}
            r={NODE_R}
            fill={tierColors[node.tier]}
            opacity={0.6}
          />
        ))}
      </Svg>
      <Text style={styles.label}>
        {totalUpstream} upstream · {totalDownstream} downstream
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: '#71717a',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
});
