import {Mock} from 'moq.ts';

import {Eval} from '../../../../src/core/interfaces/eval';

export const EvalMock = {
  evalAll: vi.fn(),
};

export const EvalMoq = new Mock<Eval>()
  .setup(mock => mock.evalAll)
  .returns(EvalMock.evalAll)
  .object();
