import React from 'react';
import { Spin } from 'antd';
import BigNumber from 'bignumber.js';
import * as ReCharts from 'recharts';
import { useWeb3Contracts } from 'web3/contracts';
import { formatUSDValue } from 'web3/utils';

import Card, { CardProps } from 'components/antd/card';
import Select, { SelectOption } from 'components/antd/select';
import Grid from 'components/custom/grid';
import IconsSet from 'components/custom/icons-set';
import { Text } from 'components/custom/typography';
import PoolTxChartProvider, { usePoolTxChart } from 'modules/yield-farming/providers/pool-tx-chart-provider';
import { ReactComponent as EmptyChartSvg } from 'resources/svg/empty-chart.svg';

import { PoolTypes, getPoolIcons, getPoolNames } from 'modules/yield-farming/utils';

import s from './s.module.scss';

const PoolFilters: SelectOption[] = [
  {
    value: PoolTypes.STABLE,
    label: getPoolNames(PoolTypes.STABLE).join('/'),
  },
  {
    value: PoolTypes.UNILP,
    label: getPoolNames(PoolTypes.UNILP).join('/'),
  },
  {
    value: PoolTypes.BOND,
    label: getPoolNames(PoolTypes.BOND).join('/'),
  },
];

const TypeFilters: SelectOption[] = [
  { value: 'all', label: 'All transactions' },
  { value: 'deposits', label: 'Deposits' },
  { value: 'withdrawals', label: 'Withdrawals' },
];

const PoolTxChartInner: React.FC = props => {
  const web3c = useWeb3Contracts();
  const poolTxChart = usePoolTxChart();

  const PeriodFilters = React.useMemo<SelectOption[]>(() => {
    const filters = [
      {
        value: 'all',
        label: 'All epochs',
      },
    ];

    let currentEpoch = 0;
    let startEpoch = 0;

    if (poolTxChart.poolFilter === PoolTypes.STABLE) {
      currentEpoch = web3c.yf.currentEpoch ?? 0;
    } else if (poolTxChart.poolFilter === PoolTypes.UNILP) {
      currentEpoch = web3c.yfLP.currentEpoch ?? 0;
      startEpoch = 1;
    } else if (poolTxChart.poolFilter === PoolTypes.BOND) {
      currentEpoch = web3c.yfBOND.currentEpoch ?? 0;
    }

    for (let i = startEpoch; i <= currentEpoch; i += 1) {
      filters.push({
        value: String(i),
        label: `Epoch ${i}`,
      });
    }

    return filters;
  }, [web3c.yf, web3c.yfLP, web3c.yfBOND, poolTxChart.poolFilter]);

  const chartData = React.useMemo(() => {
    const price = web3c.getPoolUsdPrice(poolTxChart.poolFilter as PoolTypes);

    if (!price) {
      return poolTxChart.summaries;
    }

    return poolTxChart.summaries.map(summary => {
      const deposits = new BigNumber(summary.deposits).multipliedBy(price).toNumber();
      const withdrawals = new BigNumber(summary.withdrawals).multipliedBy(price).multipliedBy(-1).toNumber();

      return {
        ...summary,
        deposits,
        withdrawals,
      };
    });
  }, [web3c, poolTxChart.summaries]);

  React.useEffect(() => {
    poolTxChart.changePoolFilter(PoolTypes.STABLE);
    poolTxChart.changePeriodFilter(undefined);
    poolTxChart.changeTypeFilter(undefined);
  }, []);

  const CardTitle = (
    <Grid flow="col" align="center" justify="space-between" className={s.chartTitleContainer}>
      <Grid flow="col" gap={8}>
        <IconsSet icons={getPoolIcons(poolTxChart.poolFilter as PoolTypes)} />
        <Select
          options={PoolFilters}
          value={poolTxChart.poolFilter}
          onSelect={value => {
            poolTxChart.changePoolFilter(value as string);
          }}
        />
      </Grid>
      <Grid flow="col" gap={8} className={s.chartTitleFilters}>
        <Select
          label="Period"
          options={PeriodFilters}
          value={poolTxChart.periodFilter ?? 'all'}
          disabled={poolTxChart.loading}
          onSelect={value => {
            poolTxChart.changePeriodFilter(value !== 'all' ? (value as string) : undefined);
          }}
        />
        <Select
          label="Show"
          options={TypeFilters}
          value={poolTxChart.typeFilter ?? 'all'}
          disabled={poolTxChart.loading}
          onSelect={value => {
            poolTxChart.changeTypeFilter(value !== 'all' ? (value as string) : undefined);
          }}
        />
      </Grid>
    </Grid>
  );

  const ChartEmpty = (
    <Grid flow="row" gap={24} align="center" justify="center" padding={[54, 0]}>
      <EmptyChartSvg />
      <Text type="p1" color="secondary">
        Not enough data to plot a graph
      </Text>
    </Grid>
  );

  return (
    <Card title={CardTitle} style={{ overflowX: 'auto' }} {...props}>
      <Spin spinning={poolTxChart.loading}>
        {chartData.length ? (
          <ReCharts.ResponsiveContainer width="100%" height={350}>
            <ReCharts.BarChart
              data={chartData}
              stackOffset="sign"
              margin={{
                top: 20,
                right: 0,
                left: 60,
                bottom: 12,
              }}>
              <ReCharts.CartesianGrid vertical={false} stroke="var(--theme-border-color)" strokeDasharray="3 3" />
              <ReCharts.XAxis dataKey="timestamp" stroke="var(--theme-border-color)" />
              <ReCharts.YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: any) => formatUSDValue(value, 2, 0)}
              />
              <ReCharts.Tooltip wrapperClassName={s.chart_tooltip} formatter={(value: any) => formatUSDValue(value)} />
              <ReCharts.Legend
                align="right"
                verticalAlign="top"
                iconType="circle"
                wrapperStyle={{
                  top: 0,
                  right: 12,
                  color: 'var(--theme-secondary-color)',
                }}
              />
              <ReCharts.ReferenceLine y={0} stroke="var(--theme-border-color)" />
              {(poolTxChart.typeFilter === undefined || poolTxChart.typeFilter === 'deposits') && (
                <ReCharts.Bar
                  dataKey="deposits"
                  name="Deposits"
                  stackId="stack"
                  fill="var(--theme-red-color)"
                  fontSize={23}
                />
              )}
              {(poolTxChart.typeFilter === undefined || poolTxChart.typeFilter === 'withdrawals') && (
                <ReCharts.Bar dataKey="withdrawals" name="Withdrawals" stackId="stack" fill="var(--theme-blue-color)" />
              )}
            </ReCharts.BarChart>
          </ReCharts.ResponsiveContainer>
        ) : (
          !poolTxChart.loading && ChartEmpty
        )}
      </Spin>
    </Card>
  );
};

const PoolTxChart: React.FC<CardProps> = props => (
  <PoolTxChartProvider>
    <PoolTxChartInner {...props} />
  </PoolTxChartProvider>
);

export default PoolTxChart;
