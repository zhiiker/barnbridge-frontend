import { AbstractConnector } from '@web3-react/abstract-connector';
import { TrezorConnector } from '@web3-react/trezor-connector';

import { WEB3_RPC_HTTPS_URL } from 'components/providers/eth-web3-provider';
import TrezorLogo from 'resources/svg/wallets/trezor-logo.svg';

import { WalletConnector } from 'wallets/types';

const WEB3_POLLING_INTERVAL = Number(process.env.REACT_APP_WEB3_POLLING_INTERVAL);
const WEB3_TREZOR_EMAIL = String(process.env.REACT_APP_WEB3_TREZOR_EMAIL);
const WEB3_TREZOR_APP_URL = String(process.env.REACT_APP_WEB3_TREZOR_APP_URL);

const TrezorWalletConfig: WalletConnector = {
  id: 'trezor',
  logo: TrezorLogo,
  name: 'Trezor',
  factory(chainId: number): AbstractConnector {
    return new TrezorConnector({
      chainId,
      url: WEB3_RPC_HTTPS_URL,
      pollingInterval: WEB3_POLLING_INTERVAL,
      manifestEmail: WEB3_TREZOR_EMAIL,
      manifestAppUrl: WEB3_TREZOR_APP_URL,
      config: {
        networkId: chainId,
      },
    });
  },
  onError(error: Error): Error | undefined {
    if (error.message === 'Cancelled') {
      return undefined;
    }
    if (error.message === 'Popup closed') {
      return undefined;
    }

    return error;
  },
};

export default TrezorWalletConfig;
