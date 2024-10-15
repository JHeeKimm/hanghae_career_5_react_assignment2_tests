import { PRODUCT_PAGE_SIZE } from '@/constants';
import { IProduct, useFetchProducts } from '@/lib/product';
import { formatPrice } from '@/utils/formatter';
import {
  mockUseAuthStore,
  mockUseCartStore,
  mockUseToastStore,
} from '@/utils/test/mockZustandStore';
import render from '@/utils/test/render';
import { waitFor, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Mock, vi } from 'vitest';
import { ProductList } from '../ProductList';
import { useNavigate } from 'react-router-dom';

interface CreateMockDataParams {
  products?: IProduct[];
  hasNextPage?: boolean;
  totalCount?: number;
  nextPage?: number | undefined;
  fetchNextPageFn?: Mock<any>;
}

const createMockData = ({
  products = [],
  hasNextPage = false,
  totalCount = products.length,
  nextPage = undefined,
  fetchNextPageFn = vi.fn(),
}: CreateMockDataParams = {}) => ({
  pages: [
    {
      products,
      hasNextPage,
      totalCount,
      nextPage,
    },
  ],
  pageParams: [undefined],
});

const mockProducts: IProduct[] = [
  {
    id: '1',
    title: 'Product 1',
    price: 1000,
    category: { id: '1', name: 'category1' },
    image: 'image_url_1',
  },
  {
    id: '2',
    title: 'Product 2',
    price: 2000,
    category: { id: '2', name: 'category2' },
    image: 'image_url_2',
  },
];

const navigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    useNavigate: () => navigate,
  };
});

describe('ProductList Component', () => {
  it('로딩이 완료된 경우 상품 리스트가 제대로 모두 노출된다', async () => {
    // Arrange: Mock 데이터 설정 및 useFetchProducts 훅의 반환 값 설정
    const mockData = createMockData({ products: mockProducts });

    (useFetchProducts as jest.Mock).mockReturnValue({
      data: mockData,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      error: null,
    });

    // Act: ProductList 컴포넌트 렌더링
    await render(<ProductList />);

    // Assert: 모든 상품 카드가 올바르게 렌더링되었는지 확인
    const productCards = screen.getAllByTestId('product-card');

    expect(within(productCards[0]).getByText('Product 1')).toBeInTheDocument();
    expect(within(productCards[0]).getByText('₩1,000')).toBeInTheDocument();
    expect(within(productCards[1]).getByText('Product 2')).toBeInTheDocument();
    expect(within(productCards[1]).getByText('₩2,000')).toBeInTheDocument();
  });

  it('보여줄 상품 리스트가 더 있는 경우 "더 보기" 버튼이 노출되며, 버튼을 누르면 상품 리스트를 더 가져온다.', async () => {
    // Arrange: 추가 페이지가 있는 mock 데이터 및 fetchNextPage 함수 모킹
    const fetchNextPageFn = vi.fn();

    const mockData = createMockData({
      products: mockProducts,
      hasNextPage: true,
      totalCount: 4,
      nextPage: 2,
      fetchNextPageFn,
    });

    (useFetchProducts as jest.Mock).mockReturnValue({
      data: mockData,
      fetchNextPage: fetchNextPageFn,
      hasNextPage: true,
      isFetchingNextPage: false,
      isLoading: false,
      error: null,
    });

    // Act: ProductList 컴포넌트 렌더링
    await render(<ProductList />);

    // Assert: "더 보기" 버튼이 표시되고 클릭 시 fetchNextPage 함수가 호출되는지 확인
    const moreButton = screen.getByRole('button', { name: /더 보기/ });
    expect(moreButton).toBeInTheDocument();

    await userEvent.click(moreButton);
    expect(fetchNextPageFn).toHaveBeenCalled();
  });

  it('보여줄 상품 리스트가 없는 경우 "더 보기" 버튼이 노출되지 않는다.', async () => {
    // Arrange: 상품이 없는 mock 데이터 설정
    const mockData = createMockData({ products: [] });

    (useFetchProducts as jest.Mock).mockReturnValue({
      data: mockData,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      error: null,
    });

    // Act: ProductList 컴포넌트 렌더링
    await render(<ProductList />);

    // Assert: "더 보기" 버튼이 노출되지 않는지 확인
    expect(
      screen.queryByRole('button', { name: /더 보기/ })
    ).not.toBeInTheDocument();
  });

  describe('로그인 상태일 경우', () => {
    const addCartItemMock = vi.fn();
    const addToastMock = vi.fn();

    beforeEach(() => {
      // Arrange: 로그인 상태 모킹
      mockUseAuthStore({
        user: {
          uid: 'mocked-uid',
          email: 'test@example.com',
          displayName: '홍길동',
        },
        isLogin: true,
      });
    });

    it('구매 버튼 클릭시 addCartItem 메서드가 호출되며, "/cart" 경로로 navigate 함수가 호출된다.', async () => {
      // Arrange: 장바구니에 아이템 추가하는 함수 및 mock 데이터 설정
      mockUseCartStore({
        addCartItem: addCartItemMock,
      });

      // 상품 데이터 모킹
      (useFetchProducts as jest.Mock).mockReturnValue({
        data: {
          pages: [{ products: mockProducts }],
        },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        error: null,
      });
      // Act: ProductList 컴포넌트 렌더링 및 구매 버튼 클릭
      await render(<ProductList />);

      const purchaseButton = await screen.findAllByRole('button', {
        name: /구매하기/,
      });
      await userEvent.click(purchaseButton[0]);

      // Assert: addCartItem 호출 및 navigate 함수 호출 확인
      await waitFor(() => {
        expect(addCartItemMock).toHaveBeenCalledWith(
          expect.objectContaining({ id: '1', title: 'Product 1' }),
          'mocked-uid',
          1
        );
        expect(navigate).toHaveBeenCalledWith('/cart');
      });
    });

    it('장바구니 버튼 클릭시 "장바구니 추가 완료!" toast를 노출하며, addCartItem 메서드가 호출된다.', async () => {
      // Arrange: 장바구니 추가 함수 및 toast 함수 모킹, mock 데이터 설정
      mockUseCartStore({
        addCartItem: addCartItemMock,
      });

      mockUseToastStore({
        addToast: addToastMock,
      });

      // 상품 데이터 모킹
      (useFetchProducts as jest.Mock).mockReturnValue({
        data: {
          pages: [{ products: mockProducts }],
        },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        error: null,
      });
      // Act: ProductList 컴포넌트 렌더링 및 장바구니 버튼 클릭
      await render(<ProductList />);

      await userEvent.click(
        screen.getAllByRole('button', { name: /장바구니/ })[0]
      );

      // Assert: addCartItem 호출 및 toast 메시지 표시 확인
      await waitFor(() => {
        expect(addCartItemMock).toHaveBeenCalledWith(
          expect.objectContaining({ id: '1', title: 'Product 1' }),
          'mocked-uid',
          1
        );
        expect(addToastMock).toHaveBeenCalledWith(
          'Product 1 상품이 장바구니에 담겼습니다.',
          'success'
        );
      });
    });
  });

  describe('로그인이 되어 있지 않은 경우', () => {
    beforeEach(() => {
      // Arrange: 로그아웃 상태 모킹
      mockUseAuthStore({
        user: null,
        isLogin: false,
      });
    });

    it('구매 버튼 클릭시 "/login" 경로로 navigate 함수가 호출된다.', async () => {
      // Act: ProductList 컴포넌트 렌더링 및 구매 버튼 클릭
      await render(<ProductList />);
      await userEvent.click(
        screen.getAllByRole('button', { name: /구매하기/ })[0]
      );

      // Assert: navigate 함수가 "/login"으로 호출되었는지 확인
      expect(navigate).toHaveBeenCalledWith('/login');
    });

    it('장바구니 버튼 클릭시 "/login" 경로로 navigate 함수가 호출된다.', async () => {
      // Act: ProductList 컴포넌트 렌더링 및 장바구니 버튼 클릭
      await render(<ProductList />);
      await userEvent.click(
        screen.getAllByRole('button', { name: /장바구니/ })[0]
      );

      // Assert: navigate 함수가 "/login"으로 호출되었는지 확인
      expect(navigate).toHaveBeenCalledWith('/login');
    });
  });
});
