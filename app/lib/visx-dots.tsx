'use client';

import React, { useMemo, useState, useCallback, useRef } from 'react';
import { Group } from '@visx/group';
import { Circle } from '@visx/shape';
import { GradientPinkRed } from '@visx/gradient';
import { scaleLinear } from '@visx/scale';
import genRandomNormalPoints, {
  PointsRange,
} from '@visx/mock-data/lib/generators/genRandomNormalPoints';
import { withTooltip, Tooltip } from '@visx/tooltip';
import { WithTooltipProvidedProps } from '@visx/tooltip/lib/enhancers/withTooltip';
import { voronoi, VoronoiPolygon } from '@visx/voronoi';
import { localPoint } from '@visx/event';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { Grid, GridRows, GridColumns } from '@visx/grid';
import { unstable_noStore as noStore } from 'next/cache';
import { randomNormal } from 'd3-random';

const points: PointsRange[] = genRandomNormalPoints(10).filter((_, i) => i < 20);

const x = (d: PointsRange) => d[0];
const y = (d: PointsRange) => d[1];

export type DotsProps = {
  width: number;
  height: number;
  showControls?: boolean;
};

let tooltipTimeout: number;

const defaultMargin = { top: 40, right: 30, bottom: 50, left: 40 };

export default withTooltip<DotsProps, PointsRange>(
  ({
    width,
    height,
    showControls = true,
    hideTooltip,
    showTooltip,
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
  }: DotsProps & WithTooltipProvidedProps<PointsRange>) => {
    if (width < 10) return null;

    noStore();

    const [showVoronoi, setShowVoronoi] = useState(showControls);
    const svgRef = useRef<SVGSVGElement>(null);
    const xScale = useMemo(
      () =>
        scaleLinear<number>({
          domain: [1.3, 2.2],
          range: [0, width],
          clamp: true,
        }),
      [width],
    );
    const yScale = useMemo(
      () =>
        scaleLinear<number>({
          domain: [0.75, 1.6],
          range: [height, 0],
          clamp: true,
        }),
      [height],
    );
    const voronoiLayout = useMemo(
      () =>
        voronoi<PointsRange>({
          x: (d) => xScale(x(d)) ?? 0,
          y: (d) => yScale(y(d)) ?? 0,
          width,
          height,
        })(points),
      [width, height, xScale, yScale],
    );

  // bounds
    const xMax = width - defaultMargin.left - defaultMargin.right;
    const yMax = height - defaultMargin.top - defaultMargin.bottom;

    function linearRegression() {
      const sumXTimesY = points.reduce((next, pair) => {
        return next + (Math.abs(pair[0]) * Math.abs(pair[1]));
      }, 0);
      const sumX = points.reduce((next, pair) => {
        return next + Math.abs(pair[0]);
      }, 0);
      const sumY = points.reduce((next, pair) => {
        return next + Math.abs(pair[1]);
      }, 0);
      const sumXSquared = points.reduce((next, pair) => {
        return next + (pair[0]^2);
      }, 0);
      console.log("sumXTimesY = " + sumXTimesY);
      console.log("sumX = " + sumX);
      console.log("sumY = " + sumY);
      console.log("sumXSquared = " + sumXSquared);
      const m = ((points.length * sumXTimesY) - (sumX * sumY)) / ((points.length * sumXSquared) - (sumX)^2);
      console.log("m = " + m);

      const b = (sumY - (m * sumX)) / points.length;
      console.log("b = " + b);

      console.log("yHat = " + m + "x + " + b);
      console.log(points);

      return [[0, b], [2, (m * 2) + b]];
    }

    const regressionPoints = linearRegression();

    // event handlers
    // const handleMouseMove = useCallback(
    //   (event: React.MouseEvent | React.TouchEvent) => {
    //     if (tooltipTimeout) clearTimeout(tooltipTimeout);
    //     if (!svgRef.current) return;

    //     // find the nearest polygon to the current mouse position
    //     const point = localPoint(svgRef.current, event);
    //     if (!point) return;
    //     const neighborRadius = 100;
    //     const closest = voronoiLayout.find(point.x, point.y, neighborRadius);
    //     if (closest) {
    //       showTooltip({
    //         tooltipLeft: xScale(x(closest.data)),
    //         tooltipTop: yScale(y(closest.data)),
    //         tooltipData: closest.data,
    //       });
    //     }
    //   },
    //   [xScale, yScale, showTooltip, voronoiLayout],
    // );

    // const handleMouseLeave = useCallback(() => {
    //   tooltipTimeout = window.setTimeout(() => {
    //     hideTooltip();
    //   }, 300);
    // }, [hideTooltip]);

    return (
      <div>
        <svg width={width} height={height} ref={svgRef}>
          <GradientPinkRed id="dots-pink" />
          {/** capture all mouse events with a rect */}
          <rect
            width={width}
            height={height}
            // rx={14}
            fill="url(#dots-pink)"
            // onMouseMove={handleMouseMove}
            // onMouseLeave={handleMouseLeave}
            // onTouchMove={handleMouseMove}
            // onTouchEnd={handleMouseLeave}
          />
          <Group pointerEvents="none">
            <Grid xScale={scaleLinear<number>({domain:[0, 10], range: [0, 500], nice: true})}
              yScale={scaleLinear<number>({domain:[0, 10], range: [0, 500], nice: true})}
              width={500}
              height={500}
              strokeWidth={2}
              stroke="#444444" />
            {/* <GridRows scale={scaleLinear<number>({domain:[0, xMax], nice: true})} width={xMax} height={yMax} stroke="#e0e0e0" />
            <GridColumns scale={scaleLinear<number>({domain:[0, xMax], nice: true})} width={xMax} height={yMax} stroke="#e0e0e0" /> */}
            <line 
              x1={0} 
              x2={500} 
              y1={yScale(regressionPoints[0][1])} 
              y2={yScale(regressionPoints[1][1])} 
              stroke="#e0e0e0" 
            />
            {/* <AxisBottom top={yMax} scale={scaleLinear<number>({domain:[0, xMax], nice: true})} numTicks={width > 520 ? 10 : 5} />
            <AxisLeft scale={scaleLinear<number>({domain:[0, xMax], nice: true})} /> */}
            {points.map((point, i) => (
              <Circle
                key={`point-${Math.abs(point[0])}-${i}`}
                className="dot"
                cx={xScale(Math.abs(x(point)))}
                cy={yScale(Math.abs(y(point)))}
                r={5}
                // r={i % 3 === 0 ? 2 : 3}
                fill={tooltipData === point ? 'white' : '#f6c431'}
              />
            ))}
            {/* {showVoronoi &&
              voronoiLayout
                .polygons()
                .map((polygon, i) => (
                  <VoronoiPolygon
                    key={`polygon-${i}`}
                    polygon={polygon}
                    fill="white"
                    stroke="white"
                    strokeWidth={1}
                    strokeOpacity={0.2}
                    fillOpacity={tooltipData === polygon.data ? 0.5 : 0}
                  />
                ))} */}
          </Group>
        </svg>
        {/* {tooltipOpen && tooltipData && tooltipLeft != null && tooltipTop != null && (
          <Tooltip left={tooltipLeft + 10} top={tooltipTop + 10}>
            <div>
              <strong>x:</strong> {x(tooltipData)}
            </div>
            <div>
              <strong>y:</strong> {y(tooltipData)}
            </div>
          </Tooltip>
        )} */}
        {/* {showControls && (
          <div>
            <label style={{ fontSize: 12 }}>
              <input
                type="checkbox"
                checked={showVoronoi}
                onChange={() => setShowVoronoi(!showVoronoi)}
              />
              &nbsp;Show voronoi point map
            </label>
          </div>
        )} */}
      </div>
    );
  },
);