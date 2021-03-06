import { AbstractConnector } from '@web3-react/abstract-connector';
import { WalletConnectConnector } from '@web3-react/walletconnect-connector';

import { WEB3_RPC_HTTPS_URL } from 'components/providers/eth-web3-provider';
import WalletConnectLogo from 'resources/svg/wallets/walletconnect-logo.svg';

import { WalletConnector } from 'wallets/types';

const WEB3_POLLING_INTERVAL = Number(process.env.REACT_APP_WEB3_POLLING_INTERVAL);
const WEB3_WALLET_CONNECT_BRIDGE = String(process.env.REACT_APP_WEB3_WALLET_CONNECT_BRIDGE);

const WalletConnectConfig: WalletConnector = {
  id: 'walletconnect',
  logo: WalletConnectLogo,
  name: 'WalletConnect',
  factory(chainId: number): AbstractConnector {
    return new WalletConnectConnector({
      rpc: {
        [chainId]: WEB3_RPC_HTTPS_URL,
      },
      pollingInterval: WEB3_POLLING_INTERVAL,
      bridge: WEB3_WALLET_CONNECT_BRIDGE,
      qrcode: true,
    });
  },
  onDisconnect(connector?: WalletConnectConnector): void {
    connector?.close();
  },
  onError(error: Error): Error | undefined {
    return error;
  },
};

export default WalletConnectConfig;
