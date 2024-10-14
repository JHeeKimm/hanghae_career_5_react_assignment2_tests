import { screen } from '@testing-library/react';

import customRender from '@/utils/test/render';
import { EmptyNotice } from '../EmptyNotice';
import { useNavigate } from 'react-router-dom';

const navigate = vi.fn();
vi.mock('react-router-dom', async (imortOriginal) => {
  const mod = await imortOriginal();
  return {
    ...mod,
    useNavigate: () => navigate,
  };
});

it('"홈으로 가기" 링크를 클릭할 경우 "/" 경로로 navigate 함수가 호출된다', async () => {
  // Arrange: EmptyNotice 컴포넌트를 렌더링
  const { user } = await customRender(<EmptyNotice />);

  // Act: "홈으로 가기" 텍스트를 가진 요소를 클릭
  await user.click(screen.getByRole('button', { name: /홈으로 가기/ }));

  // Assert: navigate 함수가 '/' 경로로 호출되었는지 확인
  expect(navigate).toHaveBeenCalledWith('/');
});
