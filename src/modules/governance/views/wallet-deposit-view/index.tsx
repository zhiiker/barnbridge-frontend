import React from 'react';
import AntdForm from 'antd/lib/form';
import AntdSwitch from 'antd/lib/switch';
import BigNumber from 'bignumber.js';
import { useWeb3Contracts } from 'web3/contracts';
import { BONDTokenMeta } from 'web3/contracts/bond';
import { CONTRACT_DAO_BARN_ADDR } from 'web3/contracts/daoBarn';
import { MAX_UINT_256, ZERO_BIG_NUMBER, formatBONDValue } from 'web3/utils';

import Alert from 'components/antd/alert';
import Button from 'components/antd/button';
import Card from 'components/antd/card';
import Form from 'components/antd/form';
import GasFeeList from 'components/custom/gas-fee-list';
import Grid from 'components/custom/grid';
import Icon from 'components/custom/icon';
import TokenAmount from 'components/custom/token-amount';
import { Text } from 'components/custom/typography';
import useMergeState from 'hooks/useMergeState';

import WalletDepositConfirmModal from './components/wallet-deposit-confirm-modal';

type DepositFormData = {
  amount?: BigNumber;
  gasPrice?: {
    value: number;
  };
};

const InitialFormValues: DepositFormData = {
  amount: undefined,
  gasPrice: undefined,
};

type WalletDepositViewState = {
  showDepositConfirmModal: boolean;
  enabling: boolean;
  enabled?: boolean;
  saving: boolean;
  expanded: boolean;
};

const InitialState: WalletDepositViewState = {
  showDepositConfirmModal: false,
  enabling: false,
  enabled: undefined,
  saving: false,
  expanded: false,
};

const WalletDepositView: React.FC = () => {
  const web3c = useWeb3Contracts();
  const [form] = AntdForm.useForm<DepositFormData>();

  const [state, setState] = useMergeState<WalletDepositViewState>(InitialState);

  const { balance: stakedBalance, userLockedUntil } = web3c.daoBarn;
  const { balance: bondBalance, barnAllowance } = web3c.bond;
  const isLocked = (userLockedUntil ?? 0) > Date.now();

  async function handleSwitchChange(checked: boolean) {
    const value = checked ? MAX_UINT_256 : ZERO_BIG_NUMBER;

    setState({ enabling: true });

    try {
      await web3c.bond.approveSend(CONTRACT_DAO_BARN_ADDR, value);
    } catch {}

    setState({ enabling: false });
  }

  async function handleSubmit(values: DepositFormData) {
    const { amount, gasPrice } = values;

    if (!amount || !gasPrice) {
      return;
    }

    setState({ saving: true });

    try {
      await web3c.daoBarn.actions.deposit(amount, gasPrice.value);
      form.setFieldsValue(InitialFormValues);
      web3c.daoBarn.reload();
      web3c.bond.reload();
    } catch {}

    setState({ saving: false });
  }

  function handleFinish(values: DepositFormData) {
    if (isLocked) {
      setState({ showDepositConfirmModal: true });
      return;
    }

    handleSubmit(values);
  }

  React.useEffect(() => {
    const isEnabled = barnAllowance?.gt(ZERO_BIG_NUMBER) ?? false;

    setState({
      enabled: isEnabled,
      expanded: isEnabled,
    });
  }, [barnAllowance]);

  const CardTitle = (
    <Grid flow="col" gap={24} colsTemplate="auto" align="start">
      <Grid flow="col" gap={12}>
        <Icon name="bond-token" width={40} height={40} />
        <Text type="p1" weight="semibold" color="primary">
          BOND
        </Text>
      </Grid>

      <Grid flow="row" gap={4}>
        <Text type="small" weight="semibold" color="secondary">
          Staked Balance
        </Text>
        <Text type="p1" weight="semibold" color="primary">
          {formatBONDValue(stakedBalance)}
        </Text>
      </Grid>

      <Grid flow="row" gap={4}>
        <Text type="small" weight="semibold" color="secondary">
          Wallet Balance
        </Text>
        <Text type="p1" weight="semibold" color="primary">
          {formatBONDValue(bondBalance)}
        </Text>
      </Grid>

      <Grid flow="row" gap={4}>
        <Text type="small" weight="semibold" color="secondary">
          Enable Token
        </Text>
        <AntdSwitch
          style={{ justifySelf: 'flex-start' }}
          checked={state.enabled}
          loading={state.enabled === undefined || state.enabling}
          onChange={handleSwitchChange}
        />
      </Grid>
    </Grid>
  );

  return (
    <Card title={CardTitle} showExpandButton={state.enabled} expanded={state.expanded}>
      <Form form={form} initialValues={InitialFormValues} validateTrigger={['onSubmit']} onFinish={handleFinish}>
        <Grid flow="row" gap={32}>
          <Grid flow="col" gap={64} colsTemplate="1fr 1fr">
            <Grid flow="row" gap={32}>
              <Form.Item name="amount" label="Amount" rules={[{ required: true, message: 'Required' }]}>
                <TokenAmount
                  tokenIcon="bond-token"
                  max={bondBalance}
                  maximumFractionDigits={BONDTokenMeta.decimals}
                  displayDecimals={4}
                  disabled={state.saving}
                  slider
                />
              </Form.Item>
              <Alert message="Deposits made after you have an ongoing lock will be added to the locked balance and will be subjected to the same lock timer." />
            </Grid>
            <Grid flow="row">
              <Form.Item
                name="gasPrice"
                label="Gas Fee (Gwei)"
                hint="This value represents the gas price you're willing to pay for each unit of gas. Gwei is the unit of ETH typically used to denominate gas prices and generally, the more gas fees you pay, the faster the transaction will be mined."
                rules={[{ required: true, message: 'Required' }]}>
                <GasFeeList disabled={state.saving} />
              </Form.Item>
            </Grid>
          </Grid>
          <Button type="primary" htmlType="submit" loading={state.saving} style={{ justifySelf: 'start' }}>
            Deposit
          </Button>
        </Grid>
      </Form>

      {state.showDepositConfirmModal && (
        <WalletDepositConfirmModal
          deposit={form.getFieldsValue().amount}
          lockDuration={userLockedUntil}
          onCancel={() => setState({ showDepositConfirmModal: false })}
          onOk={() => {
            setState({ showDepositConfirmModal: false });
            return handleSubmit(form.getFieldsValue());
          }}
        />
      )}
    </Card>
  );
};

export default WalletDepositView;
