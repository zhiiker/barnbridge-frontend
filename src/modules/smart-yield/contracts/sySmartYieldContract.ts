import BigNumber from 'bignumber.js';
import Web3Contract, { BatchContractMethod } from 'web3/contract';
import { getGasValue } from 'web3/utils';

const ABI: any[] = [
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  },
  {
    name: 'price',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  },
  {
    name: 'abondDebt',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  },
  {
    name: 'abond',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { internalType: 'uint256', name: 'principal', type: 'uint256' },
      {
        internalType: 'uint256',
        name: 'gain',
        type: 'uint256',
      },
      { internalType: 'uint256', name: 'issuedAt', type: 'uint256' },
      {
        internalType: 'uint256',
        name: 'maturesAt',
        type: 'uint256',
      },
      { internalType: 'bool', name: 'liquidated', type: 'bool' },
    ],
  },
  {
    name: 'bondGain',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        internalType: 'uint256',
        name: 'principalAmount_',
        type: 'uint256',
      },
      { internalType: 'uint16', name: 'forDays_', type: 'uint16' },
    ],
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  },
  {
    name: 'juniorBonds',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    outputs: [
      { internalType: 'uint256', name: 'tokens', type: 'uint256' },
      {
        internalType: 'uint256',
        name: 'maturesAt',
        type: 'uint256',
      },
    ],
  },
  {
    name: 'seniorBonds',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    outputs: [
      { internalType: 'uint256', name: 'principal', type: 'uint256' },
      {
        internalType: 'uint256',
        name: 'gain',
        type: 'uint256',
      },
      { internalType: 'uint256', name: 'issuedAt', type: 'uint256' },
      {
        internalType: 'uint256',
        name: 'maturesAt',
        type: 'uint256',
      },
      { internalType: 'bool', name: 'liquidated', type: 'bool' },
    ],
  },
  {
    name: 'buyTokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        internalType: 'uint256',
        name: 'underlyingAmount_',
        type: 'uint256',
      },
      { internalType: 'uint256', name: 'minTokens_', type: 'uint256' },
      {
        internalType: 'uint256',
        name: 'deadline_',
        type: 'uint256',
      },
    ],
    outputs: [],
  },
  {
    name: 'buyBond',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        internalType: 'uint256',
        name: 'principalAmount_',
        type: 'uint256',
      },
      { internalType: 'uint256', name: 'minGain_', type: 'uint256' },
      {
        internalType: 'uint256',
        name: 'deadline_',
        type: 'uint256',
      },
      { internalType: 'uint16', name: 'forDays_', type: 'uint16' },
    ],
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  },
  {
    name: 'buyJuniorBond',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { internalType: 'uint256', name: 'tokenAmount_', type: 'uint256' },
      {
        internalType: 'uint256',
        name: 'maxMaturesAt_',
        type: 'uint256',
      },
      { internalType: 'uint256', name: 'deadline_', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'sellTokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { internalType: 'uint256', name: 'tokenAmount_', type: 'uint256' },
      {
        internalType: 'uint256',
        name: 'minUnderlying_',
        type: 'uint256',
      },
      { internalType: 'uint256', name: 'deadline_', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'redeemJuniorBond',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ internalType: 'uint256', name: 'jBondId_', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'redeemBond',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ internalType: 'uint256', name: 'bondId_', type: 'uint256' }],
    outputs: [],
  },
];

export type SYJuniorBondToken = {
  jBondId: number;
  tokens: BigNumber;
  maturesAt: number;
};

export type SYSeniorBondToken = {
  sBondId: number;
  principal: BigNumber;
  gain: BigNumber;
  issuedAt: number;
  maturesAt: number;
  liquidated: boolean;
};

export type SYAbond = {
  principal: BigNumber;
  gain: BigNumber;
  issuedAt: number;
  maturesAt: number;
  liquidated: boolean;
};

class SYSmartYieldContract extends Web3Contract {
  constructor(address: string) {
    super(ABI, address, '');
  }

  async getBalance(): Promise<BigNumber> {
    if (!this.account) {
      return Promise.reject();
    }

    return this.call('balanceOf', [this.account]).then(value => new BigNumber(value));
  }

  async getTotalSupply(): Promise<BigNumber> {
    return this.call('totalSupply').then(value => new BigNumber(value));
  }

  async getPrice(): Promise<BigNumber> {
    return this.call('price').then(value => new BigNumber(value));
  }

  async getAbondDebt(): Promise<BigNumber> {
    return this.call('abondDebt').then(value => new BigNumber(value));
  }

  async getAbond(): Promise<SYAbond> {
    return this.call('abond').then(value => ({
      ...value,
      principal: new BigNumber(value.principal),
      gain: new BigNumber(value.gain),
      issuedAt: Math.floor(new BigNumber(value.issuedAt).dividedBy(1e18).toNumber()),
      maturesAt: Math.floor(new BigNumber(value.maturesAt).dividedBy(1e18).toNumber()),
    }));
  }

  async getBondGain(principalAmount: BigNumber, forDays: number): Promise<BigNumber> {
    return this.call('bondGain', [principalAmount, forDays]).then(value => new BigNumber(value));
  }

  async getJuniorBonds(jBondIds: number[]): Promise<SYJuniorBondToken[]> {
    if (jBondIds.length === 0) {
      return Promise.resolve([]);
    }

    const methods = jBondIds.map<BatchContractMethod>(jBondId => ({
      method: 'juniorBonds',
      methodArgs: [jBondId],
      transform: value => ({
        jBondId,
        tokens: new BigNumber(value.tokens),
        maturesAt: Number(value.maturesAt),
      }),
    }));

    return this.batch(methods);
  }

  async getSeniorBonds(sBondIds: number[]): Promise<SYSeniorBondToken[]> {
    if (sBondIds.length === 0) {
      return Promise.resolve([]);
    }

    const methods = sBondIds.map<BatchContractMethod>(sBondId => ({
      method: 'seniorBonds',
      methodArgs: [sBondId],
      transform: value => ({
        sBondId,
        principal: new BigNumber(value.principal),
        gain: new BigNumber(value.gain),
        issuedAt: Number(value.issuedAt),
        maturesAt: Number(value.maturesAt),
      }),
    }));

    return this.batch(methods);
  }

  buyTokensSend(underlyingAmount: BigNumber, minTokens: BigNumber, deadline: number, gasPrice: number): Promise<void> {
    if (!this.account) {
      return Promise.reject();
    }

    return this.send('buyTokens', [underlyingAmount, minTokens, deadline], {
      from: this.account,
      gasPrice: getGasValue(gasPrice),
    });
  }

  buyBondSend(
    principalAmount: BigNumber,
    minGain: BigNumber,
    deadline: number,
    forDays: number,
    gasPrice: number,
  ): Promise<void> {
    if (!this.account) {
      return Promise.reject();
    }

    return this.send('buyBond', [principalAmount, minGain, deadline, forDays], {
      from: this.account,
      gasPrice: getGasValue(gasPrice),
    });
  }

  buyJuniorBondSend(tokenAmount: BigNumber, maxMaturesAt: number, deadline: number, gasPrice: number): Promise<void> {
    if (!this.account) {
      return Promise.reject();
    }

    return this.send('buyJuniorBond', [tokenAmount, maxMaturesAt, deadline], {
      from: this.account,
      gasPrice: getGasValue(gasPrice),
    });
  }

  sellTokensSend(tokenAmount: BigNumber, minUnderlying: BigNumber, deadline: number, gasPrice: number): Promise<void> {
    if (!this.account) {
      return Promise.reject();
    }

    return this.send('sellTokens', [tokenAmount, minUnderlying, deadline], {
      from: this.account,
      gasPrice: getGasValue(gasPrice),
    });
  }

  redeemJuniorBondSend(jBondId: number, gasPrice: number): Promise<void> {
    if (!this.account) {
      return Promise.reject();
    }

    return this.send('redeemJuniorBond', [jBondId], {
      from: this.account,
      gasPrice: getGasValue(gasPrice),
    });
  }

  redeemBondSend(sBondId: number, gasPrice: number): Promise<void> {
    if (!this.account) {
      return Promise.reject();
    }

    return this.send('redeemBond', [sBondId], {
      from: this.account,
      gasPrice: getGasValue(gasPrice),
    });
  }
}

export default SYSmartYieldContract;
