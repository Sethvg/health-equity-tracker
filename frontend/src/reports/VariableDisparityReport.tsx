import { Grid } from "@material-ui/core";
import React, { useState } from "react";
import { DisparityBarChartCard } from "../cards/DisparityBarChartCard";
import { MapCard } from "../cards/MapCard";
import { PopulationCard } from "../cards/PopulationCard";
import { SimpleBarChartCard } from "../cards/SimpleBarChartCard";
import { TableCard } from "../cards/TableCard";
import { UnknownsMapCard } from "../cards/UnknownsMapCard";
import { METRIC_CONFIG, VariableConfig } from "../data/config/MetricConfig";
import { BreakdownVar, DEMOGRAPHIC_BREAKDOWNS } from "../data/query/Breakdowns";
import { Fips } from "../data/utils/Fips";
import { DropdownVarId } from "../utils/MadLibs";
import {
  getParameter,
  setParameter,
  setParameters,
  usePopStateEffect,
} from "../utils/urlutils";
import NoDataAlert from "./ui/NoDataAlert";
import ReportToggleControls from "./ui/ReportToggleControls";

export interface VariableDisparityReportProps {
  key: string;
  dropdownVarId: DropdownVarId;
  fips: Fips;
  updateFipsCallback: Function;
  hidePopulationCard?: boolean;
}

export function VariableDisparityReport(props: VariableDisparityReportProps) {
  const [currentBreakdown, setCurrentBreakdown] = useState<BreakdownVar>(
    getParameter("demo", "race_and_ethnicity")
  );

  // TODO Remove hard coded fail safe value
  const [variableConfig, setVariableConfig] = useState<VariableConfig | null>(
    Object.keys(METRIC_CONFIG).includes(props.dropdownVarId)
      ? METRIC_CONFIG[props.dropdownVarId][0]
      : null
  );

  const setVariableConfigWithParam = (v: VariableConfig) => {
    setParameters([
      { name: "dt1", value: v.variableId },
      { name: "dt2", value: null },
    ]);
    setVariableConfig(v);
  };

  const setDemoWithParam = (str: BreakdownVar) => {
    setParameter("demo", str);
    setCurrentBreakdown(str);
  };

  const readParams = () => {
    const demoParam1 = getParameter("dt1", undefined, (val: string) => {
      return METRIC_CONFIG[props.dropdownVarId].find(
        (cfg) => cfg.variableId === val
      );
    });
    setVariableConfig(
      demoParam1 ? demoParam1 : METRIC_CONFIG[props.dropdownVarId][0]
    );

    const demo: BreakdownVar = getParameter("demo", "race_and_ethnicity");
    setCurrentBreakdown(demo);
  };

  usePopStateEffect(readParams);

  const breakdownIsShown = (breakdownVar: string) =>
    currentBreakdown === breakdownVar;

  return (
    <Grid container xs={12} spacing={1} justify="center">
      {!props.hidePopulationCard && (
        <Grid item xs={12}>
          <PopulationCard fips={props.fips} />
        </Grid>
      )}

      {!variableConfig && <NoDataAlert dropdownVarId={props.dropdownVarId} />}

      {variableConfig && (
        <Grid container spacing={1} justify="center">
          <Grid container xs={12}>
            <ReportToggleControls
              dropdownVarId={props.dropdownVarId}
              variableConfig={variableConfig}
              setVariableConfig={setVariableConfigWithParam}
              currentBreakdown={currentBreakdown}
              setCurrentBreakdown={setDemoWithParam}
            />
          </Grid>
          <Grid item xs={12} sm={12} md={6}>
            <MapCard
              variableConfig={variableConfig}
              fips={props.fips}
              updateFipsCallback={(fips: Fips) => {
                props.updateFipsCallback(fips);
              }}
              currentBreakdown={currentBreakdown}
            />
            {DEMOGRAPHIC_BREAKDOWNS.map((breakdownVar) => (
              <>
                {breakdownIsShown(breakdownVar) && (
                  <TableCard
                    fips={props.fips}
                    variableConfig={variableConfig}
                    breakdownVar={breakdownVar}
                  />
                )}
              </>
            ))}
          </Grid>
          <Grid item xs={12} sm={12} md={6}>
            {variableConfig.metrics["pct_share"] && (
              <UnknownsMapCard
                variableConfig={variableConfig}
                fips={props.fips}
                updateFipsCallback={(fips: Fips) => {
                  props.updateFipsCallback(fips);
                }}
                currentBreakdown={currentBreakdown}
              />
            )}
            {DEMOGRAPHIC_BREAKDOWNS.map((breakdownVar) => (
              <>
                {breakdownIsShown(breakdownVar) &&
                  variableConfig.metrics["pct_share"] && (
                    <DisparityBarChartCard
                      variableConfig={variableConfig}
                      breakdownVar={breakdownVar}
                      fips={props.fips}
                    />
                  )}
                {breakdownIsShown(breakdownVar) &&
                  variableConfig.metrics["per100k"] && (
                    <SimpleBarChartCard
                      variableConfig={variableConfig}
                      breakdownVar={breakdownVar}
                      fips={props.fips}
                    />
                  )}
              </>
            ))}
          </Grid>
        </Grid>
      )}
    </Grid>
  );
}
