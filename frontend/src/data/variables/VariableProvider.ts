import { Breakdowns, BreakdownVar } from "../query/Breakdowns";
import {
  MetricQueryResponse,
  createMissingDataResponse,
  MetricQuery,
} from "../query/MetricQuery";
import { MetricId } from "../config/MetricConfig";
import { ProviderId } from "../loading/VariableProviderMap";
import { IDataFrame } from "data-forge";
import { Fips } from "../../data/utils/Fips";
import { ALL, TOTAL } from "../utils/Constants";
import { DatasetCalculator } from "../utils/DatasetCalculator";

abstract class VariableProvider {
  readonly providerId: ProviderId;
  readonly providesMetrics: MetricId[];
  protected readonly calculations = new DatasetCalculator();

  constructor(providerId: ProviderId, providesMetrics: MetricId[]) {
    this.providerId = providerId;
    this.providesMetrics = providesMetrics;
  }

  async getData(metricQuery: MetricQuery): Promise<MetricQueryResponse> {
    if (!this.allowsBreakdowns(metricQuery.breakdowns)) {
      return createMissingDataResponse(
        "Breakdowns not supported for provider " +
          this.providerId +
          ": " +
          metricQuery.breakdowns.getUniqueKey()
      );
    }

    // TODO - check that the metrics are all provided by this provider once we don't have providers relying on other providers

    return await this.getDataInternal(metricQuery);
  }

  filterByGeo(df: IDataFrame, breakdowns: Breakdowns): IDataFrame {
    const fipsColumn: string =
      breakdowns.geography === "county" ? "county_fips" : "state_fips";

    if (breakdowns.filterFips !== undefined) {
      const fips = breakdowns.filterFips as Fips;
      if (fips.isState() && breakdowns.geography === "county") {
        return df
          .where((row) => fips.isParentOf(row["county_fips"]))
          .resetIndex();
      } else {
        return df.where((row) => row[fipsColumn] === fips.code).resetIndex();
      }
    }
    return df;
  }

  renameGeoColumns(df: IDataFrame, breakdowns: Breakdowns): IDataFrame {
    let newDataframe = df;
    const [fipsColumn, geoNameColumn] =
      breakdowns.geography === "county"
        ? ["county_fips", "county_name"]
        : ["state_fips", "state_name"];

    if (breakdowns.geography === "county") {
      newDataframe = newDataframe.dropSeries(["state_fips"]).resetIndex();
    }

    return newDataframe
      .renameSeries({
        [fipsColumn]: "fips",
        [geoNameColumn]: "fips_name",
      })
      .resetIndex();
  }

  removeUnrequestedColumns(df: IDataFrame, metricQuery: MetricQuery) {
    let dataFrame = df;
    let requestedColumns = ["fips", "fips_name"].concat(metricQuery.metricIds);
    // Add column names of enabled breakdowns
    requestedColumns = requestedColumns.concat(
      Object.entries(metricQuery.breakdowns.demographicBreakdowns)
        .filter(([unusedKey, breakdown]) => breakdown.enabled)
        .map(([unusedKey, breakdown]) => breakdown.columnName)
    );

    const columnsToRemove = dataFrame
      .getColumnNames()
      .filter((column) => !requestedColumns.includes(column));

    return dataFrame.dropSeries(columnsToRemove).resetIndex();
  }

  // Renames all instances of Total in the column to All
  // TODO: Backend should do this instead so frontend doesn't have to
  renameTotalToAll(df: IDataFrame, columnName: string) {
    return df.transformSeries({
      [columnName]: (series) => (series === TOTAL ? ALL : series),
    });
  }

  applyDemographicBreakdownFilters(
    df: IDataFrame,
    breakdowns: Breakdowns
  ): IDataFrame {
    let dataFrame = df;
    Object.values(breakdowns.demographicBreakdowns).forEach((demo) => {
      if (demo.enabled && demo.filter) {
        const filter = demo.filter;
        dataFrame = dataFrame
          .where((row) => {
            const value = row[demo.columnName];
            return filter.include === filter.values.includes(value);
          })
          .resetIndex();
      }
    });
    return dataFrame;
  }

  abstract getDataInternal(
    metricQuery: MetricQuery
  ): Promise<MetricQueryResponse>;

  abstract allowsBreakdowns(breakdowns: Breakdowns): boolean;
}

export default VariableProvider;
