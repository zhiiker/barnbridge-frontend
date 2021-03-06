import React from 'react';
import { useHistory } from 'react-router-dom';
import useDebounce from '@rooks/use-debounce';
import * as Antd from 'antd';
import BigNumber from 'bignumber.js';
import cn from 'classnames';
import differenceInDays from 'date-fns/differenceInDays';
import isAfter from 'date-fns/isAfter';
import isBefore from 'date-fns/isBefore';
import startOfDay from 'date-fns/startOfDay';
import { ZERO_BIG_NUMBER, formatBigValue, getHumanValue, getNonHumanValue } from 'web3/utils';

import Button from 'components/antd/button';
import DatePicker from 'components/antd/datepicker';
import Form from 'components/antd/form';
import Input from 'components/antd/input';
import Icon, { TokenIconNames } from 'components/custom/icon';
import TokenAmount from 'components/custom/token-amount';
import { Text } from 'components/custom/typography';
import { mergeState } from 'hooks/useMergeState';
import TransactionDetails from 'modules/smart-yield/components/transaction-details';
import TransactionSummary from 'modules/smart-yield/components/transaction-summary';
import TxConfirmModal from 'modules/smart-yield/components/tx-confirm-modal';
import SYControllerContract from 'modules/smart-yield/contracts/syControllerContract';
import SYSmartYieldContract from 'modules/smart-yield/contracts/sySmartYieldContract';
import { SYPool, useSYPool } from 'modules/smart-yield/providers/pool-provider';
import { useWallet } from 'wallets/wallet';

import {
  DURATION_1_DAY,
  DURATION_1_WEEK,
  DURATION_2_WEEKS,
  DURATION_30_DAYS,
  DURATION_3_WEEKS,
  getDurationDate,
} from 'utils/date';

type FormData = {
  amount?: BigNumber;
  maturityDate?: Date;
  slippageTolerance?: number;
  deadline?: number;
};

const InitialFormValues: FormData = {
  amount: undefined,
  maturityDate: undefined,
  slippageTolerance: 0.5,
  deadline: 20,
};

const DURATION_OPTIONS = [DURATION_1_DAY, DURATION_1_WEEK, DURATION_2_WEEKS, DURATION_3_WEEKS, DURATION_30_DAYS];

type State = {
  isSaving: boolean;
  depositModalVisible: boolean;
};

const InitialState: State = {
  isSaving: false,
  depositModalVisible: false,
};

const SeniorTranche: React.FC = () => {
  const history = useHistory();
  const wallet = useWallet();
  const poolCtx = useSYPool();
  const [form] = Antd.Form.useForm<FormData>();

  const { pool, marketId, tokenId } = poolCtx;

  const [state, setState] = React.useState<State>(InitialState);
  const [bondGain, setBondGain] = React.useState<BigNumber | undefined>();

  const [formState, setFormState] = React.useState<FormData>(InitialFormValues);
  const [jseniorRedeemFee, setSeniorRedeemFee] = React.useState<BigNumber | undefined>();

  React.useEffect(() => {
    if (!pool) {
      return;
    }

    const controllerContract = new SYControllerContract(pool.controllerAddress);
    controllerContract.setProvider(wallet.provider);
    controllerContract.getSeniorRedeemFee().then(setSeniorRedeemFee);
  }, [pool?.controllerAddress]);

  const formDisabled = !pool?.underlyingIsAllowed;

  const handleTxDetailsChange = React.useCallback(values => {
    form.setFieldsValue(values);
  }, []);

  function handleCancel() {
    history.push({
      pathname: `/smart-yield/deposit`,
      search: `?m=${marketId}&t=${tokenId}`,
    });
  }

  function handleSubmit() {
    setState(
      mergeState<State>({
        depositModalVisible: true,
      }),
    );
  }

  function handleDepositCancel() {
    setState(
      mergeState<State>({
        depositModalVisible: false,
      }),
    );
  }

  async function handleDepositConfirm({ gasPrice }: any) {
    if (!pool) {
      return;
    }

    const { amount, maturityDate, slippageTolerance, deadline } = form.getFieldsValue();

    if (!amount) {
      return;
    }

    setState(
      mergeState<State>({
        depositModalVisible: false,
        isSaving: true,
      }),
    );

    const smartYieldContract = new SYSmartYieldContract(pool.smartYieldAddress);
    smartYieldContract.setProvider(wallet.provider);
    smartYieldContract.setAccount(wallet.account);

    try {
      const decimals = pool.underlyingDecimals;
      const amountScaled = getNonHumanValue(amount, decimals);
      const deadlineTs = Math.floor(Date.now() / 1_000 + Number(deadline ?? 0) * 60);
      const lockDays = differenceInDays(maturityDate ?? startOfDay(new Date()), startOfDay(new Date()));

      const minGain = await smartYieldContract.getBondGain(amountScaled, lockDays);
      const minGainMFee = minGain.multipliedBy(1 - (slippageTolerance ?? 0) / 100);
      const gain = new BigNumber(Math.round(minGainMFee.toNumber()));

      await poolCtx.actions.seniorDeposit(amountScaled, gain, deadlineTs, lockDays ?? 0, gasPrice);
      form.resetFields();
    } catch {}

    setState(
      mergeState<State>({
        isSaving: false,
      }),
    );
  }

  function handleValuesChange(changedValues: Partial<FormData>, allValues: FormData) {
    setFormState(allValues);
  }

  const getBondGain = useDebounce((pPool: SYPool, pAmount: BigNumber, pMaturityDate: number) => {
    const smartYieldContract = new SYSmartYieldContract(pPool.smartYieldAddress);
    smartYieldContract.setProvider(wallet.provider);
    smartYieldContract.setAccount(wallet.account);

    const decimals = pPool.underlyingDecimals;
    const amount = pAmount?.multipliedBy(10 ** decimals) ?? ZERO_BIG_NUMBER;
    const today = startOfDay(new Date());
    const days = differenceInDays(pMaturityDate ?? today, today);

    smartYieldContract.getBondGain(amount, days).then(setBondGain);
  }, 400);

  React.useEffect(() => {
    if (!pool) {
      return;
    }

    getBondGain(pool, formState.amount, formState.maturityDate);
  }, [pool, formState.amount, formState.maturityDate]);

  const maturityDays = React.useMemo(() => {
    const today = startOfDay(new Date());
    return differenceInDays(formState.maturityDate ?? today, today);
  }, [formState.maturityDate]);

  const apy = React.useMemo(() => {
    if (maturityDays <= 0 || !formState.amount || formState.amount?.isEqualTo(ZERO_BIG_NUMBER)) {
      return ZERO_BIG_NUMBER;
    }

    // return (formState.amount ?? ZERO_BIG_NUMBER)
    //   .plus() ?? ZERO_BIG_NUMBER)
    //   .dividedBy(maturityDays)
    //   .dividedBy(365);
    return (
      bondGain
        ?.dividedBy(10 ** (pool?.underlyingDecimals ?? 0))
        .dividedBy(formState.amount ?? 1)
        .dividedBy(maturityDays)
        .multipliedBy(365)
        .multipliedBy(100) ?? ZERO_BIG_NUMBER
    );
  }, [pool, bondGain, maturityDays]);

  const reward = formState.amount
    ?.multipliedBy(10 ** (pool?.underlyingDecimals ?? 0))
    ?.plus(bondGain?.multipliedBy(1 - (jseniorRedeemFee?.dividedBy(1e18)?.toNumber() ?? 0)) ?? ZERO_BIG_NUMBER);

  return (
    <>
      <Text type="h3" weight="semibold" color="primary" className="mb-16">
        Senior deposit
      </Text>
      <Text type="p2" weight="semibold" className="mb-32">
        Choose the amount of tokens you want to deposit in the senior bond. Make sure you double check the amounts,
        including reward at maturity and maturity date.
      </Text>
      <Form
        className="grid flow-row row-gap-32"
        form={form}
        initialValues={InitialFormValues}
        validateTrigger={['onSubmit']}
        onValuesChange={handleValuesChange}
        onFinish={handleSubmit}>
        <Form.Item name="amount" label="Amount" rules={[{ required: true, message: 'Required' }]}>
          <TokenAmount
            tokenIcon={pool?.meta?.icon as TokenIconNames}
            max={getHumanValue(pool?.underlyingMaxAllowed, pool?.underlyingDecimals)}
            maximumFractionDigits={pool?.underlyingDecimals}
            displayDecimals={4}
            disabled={formDisabled || state.isSaving}
            slider
          />
        </Form.Item>
        <Form.Item
          name="maturityDate"
          label="Maturity date"
          hint="You can select a maturity date between 1 and 30 days, in increments of 1 day."
          rules={[{ required: true, message: 'Required' }]}>
          <DatePicker
            showNow={false}
            disabledDate={(date: Date) =>
              isBefore(date, new Date()) || isAfter(date, getDurationDate(new Date(), DURATION_30_DAYS)!)
            }
            format="DD/MM/YYYY"
            size="large"
            disabled={formDisabled || state.isSaving}
          />
        </Form.Item>
        <Form.Item shouldUpdate noStyle>
          {() => {
            return (
              <div className="flexbox-list" style={{ '--gap': '8px' } as React.CSSProperties}>
                {DURATION_OPTIONS.map(opt => {
                  const today = startOfDay(new Date());
                  const date = getDurationDate(today, opt);
                  const { maturityDate } = form.getFieldsValue();

                  return (
                    <button
                      key={opt}
                      type="button"
                      className={cn('button-ghost-monochrome ph-24 pv-16', {
                        selected: date?.valueOf() === maturityDate?.valueOf(),
                      })}
                      disabled={formDisabled || state.isSaving}
                      onClick={() => {
                        form.setFieldsValue({
                          maturityDate: date,
                        });
                        setFormState(
                          mergeState<FormData>({
                            maturityDate: date,
                          }),
                        );
                      }}>
                      <Text type="p1" weight="semibold" color="primary">
                        {opt}
                      </Text>
                    </button>
                  );
                })}
              </div>
            );
          }}
        </Form.Item>
        <Form.Item name="slippageTolerance" noStyle hidden>
          <Input />
        </Form.Item>
        <Form.Item name="deadline" noStyle hidden>
          <Input />
        </Form.Item>
        <Form.Item shouldUpdate noStyle>
          {() => {
            const { slippageTolerance, deadline } = form.getFieldsValue();

            return (
              <TransactionDetails
                slippageTolerance={slippageTolerance}
                deadline={deadline}
                onChange={handleTxDetailsChange}
              />
            );
          }}
        </Form.Item>
        <TransactionSummary
          apy={apy}
          gain={getHumanValue(bondGain, pool?.underlyingDecimals)}
          gainFee={jseniorRedeemFee?.dividedBy(1e18)}
          reward={getHumanValue(reward, pool?.underlyingDecimals) ?? ZERO_BIG_NUMBER}
          symbol={pool?.underlyingSymbol}
        />
        <div className="grid flow-col col-gap-32 align-center justify-space-between">
          <button type="button" className="button-text" disabled={state.isSaving} onClick={handleCancel}>
            <Icon name="left-arrow" width={9} height={8} className="mr-12" color="inherit" />
            Cancel
          </button>
          <Button type="primary" htmlType="submit" disabled={formDisabled} loading={state.isSaving}>
            Deposit
          </Button>
        </div>
      </Form>

      {state.depositModalVisible && (
        <TxConfirmModal
          visible
          title="Confirm your deposit"
          header={
            <div className="grid flow-col col-gap-32">
              <div className="grid flow-row row-gap-4">
                <Text type="small" weight="semibold" color="secondary">
                  Redeemable amount
                </Text>
                <Text type="p1" weight="semibold" color="primary">
                  {formatBigValue(getHumanValue(reward, pool?.underlyingDecimals))} {pool?.underlyingSymbol}
                </Text>
              </div>
              <div className="grid flow-row row-gap-4">
                <Text type="small" weight="semibold" color="secondary">
                  Deposited amount
                </Text>
                <Text type="p1" weight="semibold" color="primary">
                  {formatBigValue(form.getFieldValue('amount'))} {pool?.underlyingSymbol}
                </Text>
              </div>
              <div className="grid flow-row row-gap-4">
                <Text type="small" weight="semibold" color="secondary">
                  Maturity in
                </Text>
                <Text type="p1" weight="semibold" color="primary">
                  {maturityDays} days
                </Text>
              </div>
              <div className="grid flow-row row-gap-4">
                <Text type="small" weight="semibold" color="secondary">
                  APY
                </Text>
                <Text type="p1" weight="semibold" color="green">
                  {apy.toFixed(2)}%
                </Text>
              </div>
            </div>
          }
          submitText="Confirm your deposit"
          onCancel={handleDepositCancel}
          onConfirm={handleDepositConfirm}
        />
      )}
    </>
  );
};

export default SeniorTranche;
