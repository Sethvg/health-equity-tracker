import React from "react";
import { CardContent } from "@material-ui/core";
import { ChoroplethMap } from "../charts/ChoroplethMap";
import { Fips } from "../data/utils/Fips";
import { VariableConfig } from "../data/config/MetricConfig";
import MapBreadcrumbs from "./ui/MapBreadcrumbs";
import { Row } from "../data/utils/DatasetTypes";
import CardWrapper from "./CardWrapper";
import { MetricQuery } from "../data/query/MetricQuery";
import MissingDataAlert from "./ui/MissingDataAlert";
import {
  Breakdowns,
  BreakdownVar,
  BREAKDOWN_VAR_DISPLAY_NAMES,
} from "../data/query/Breakdowns";
import { UNKNOWN, UNKNOWN_RACE } from "../data/utils/Constants";
import styles from "./Card.module.scss";
import Divider from "@material-ui/core/Divider";
import Alert from "@material-ui/lab/Alert";
import UnknownsAlert from "./ui/UnknownsAlert";

export interface UnknownsMapCardProps {
  // Variable the map will evaluate for unknowns
  variableConfig: VariableConfig;
  // Breakdown value to evaluate for unknowns
  currentBreakdown: BreakdownVar;
  // Geographic region of maps
  fips: Fips;
  // Updates the madlib
  updateFipsCallback: (fips: Fips) => void;
}

// This wrapper ensures the proper key is set to create a new instance when required (when
// the props change and the state needs to be reset) rather than relying on the card caller.
export function UnknownsMapCard(props: UnknownsMapCardProps) {
  return (
    <UnknownsMapCardWithKey
      key={props.currentBreakdown + props.variableConfig.variableId}
      {...props}
    />
  );
}

function UnknownsMapCardWithKey(props: UnknownsMapCardProps) {
  const metricConfig = props.variableConfig.metrics["pct_share"];

  const signalListeners: any = {
    click: (...args: any) => {
      const clickedData = args[1];
      props.updateFipsCallback(new Fips(clickedData.id));
    },
  };

  // TODO Debug why onlyInclude(UNKNOWN, UNKNOWN_RACE) isn't working
  const mapGeoBreakdowns = Breakdowns.forParentFips(props.fips).addBreakdown(
    props.currentBreakdown
  );
  const alertBreakdown = Breakdowns.forFips(props.fips).addBreakdown(
    props.currentBreakdown
  );

  const mapQuery = new MetricQuery([metricConfig.metricId], mapGeoBreakdowns);
  const alertQuery = new MetricQuery([metricConfig.metricId], alertBreakdown);

  return (
    <CardWrapper
      queries={[mapQuery, alertQuery]}
      title={
        <>{`Unknown ${
          BREAKDOWN_VAR_DISPLAY_NAMES[props.currentBreakdown]
        } for ${metricConfig.fullCardTitleName}`}</>
      }
    >
      {([mapQueryResponse, alertQueryResponse]) => {
        const unknowns = mapQueryResponse
          .getValidRowsForField(props.currentBreakdown)
          .filter(
            (row: Row) =>
              row[props.currentBreakdown] === UNKNOWN_RACE ||
              row[props.currentBreakdown] === UNKNOWN
          );

        return (
          <>
            <CardContent className={styles.SmallMarginContent}>
              <MapBreadcrumbs
                fips={props.fips}
                updateFipsCallback={props.updateFipsCallback}
              />
            </CardContent>
            <Divider />
            <UnknownsAlert
              queryResponse={alertQueryResponse}
              metricConfig={metricConfig}
              breakdownVar={props.currentBreakdown}
              displayType="map"
              known={false}
            />
            <CardContent>
              {mapQueryResponse.dataIsMissing() && (
                <MissingDataAlert
                  dataName={metricConfig.fullCardTitleName}
                  breakdownString={
                    BREAKDOWN_VAR_DISPLAY_NAMES[props.currentBreakdown]
                  }
                />
              )}
              {!mapQueryResponse.dataIsMissing() && unknowns.length === 0 && (
                <Alert severity="info">
                  No unknown values for{" "}
                  {BREAKDOWN_VAR_DISPLAY_NAMES[props.currentBreakdown]} reported
                  in this dataset.
                </Alert>
              )}
              {!mapQueryResponse.dataIsMissing() && unknowns.length > 0 && (
                <ChoroplethMap
                  signalListeners={signalListeners}
                  metric={metricConfig}
                  legendTitle={metricConfig.fullCardTitleName}
                  data={unknowns}
                  showCounties={props.fips.isUsa() ? false : true}
                  fips={props.fips}
                  scaleType="quantile"
                  scaleColorScheme="greenblue"
                  hideLegend={
                    mapQueryResponse.dataIsMissing() || unknowns.length <= 1
                  }
                />
              )}
            </CardContent>
          </>
        );
      }}
    </CardWrapper>
  );
}
