import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PortalHotelesReportsPage } from './reports.page';

describe('PortalHotelesReportsPage', () => {
  let component: PortalHotelesReportsPage;
  let fixture: ComponentFixture<PortalHotelesReportsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalHotelesReportsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(PortalHotelesReportsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the reports page scaffold', () => {
    // Arrange

    // Act
    const createdComponent = component;

    // Assert
    expect(createdComponent).toBeTruthy();
  });

  it('renders the reports heading', () => {
    // Arrange

    // Act
    const element = fixture.nativeElement as HTMLElement;

    // Assert
    expect(element.textContent).toContain('Incoming Report');
    expect(element.textContent).toContain("Welcome back! Here's what's happening at your hotel today.");
  });

  it('renders kpi cards and first page rows', () => {
    // Arrange

    // Act
    const element = fixture.nativeElement as HTMLElement;
    const kpiCards = element.querySelectorAll('.portal-hoteles-reports-kpi');
    const rows = element.querySelectorAll('.portal-hoteles-reports-table__row');

    // Assert
    expect(kpiCards.length).toBe(2);
    expect(rows.length).toBe(5);
    expect(element.textContent).toContain('Avg. Daily Revenue');
    expect(element.textContent).toContain('Monthly Revenue');
    expect(element.textContent).toContain('PDF');
    expect(element.textContent).toContain('Excel');
  });

  it('moves to next page and updates range/pagination labels', () => {
    // Arrange

    // Act
    component.onNextPage();
    fixture.detectChanges();

    // Assert
    expect(component.paginationLabel).toBe('Page 2 of 2');
    expect(component.rangeLabel).toBe('Showing 6-6 of 6 transactions');
    expect(component.visibleRows.length).toBe(1);
  });

  it('returns expected payment status classes', () => {
    // Arrange

    // Act
    const paidClass = component.getPaymentStatusClass('Paid');
    const pendingClass = component.getPaymentStatusClass('Pending');
    const failedClass = component.getPaymentStatusClass('Failed');
    const unknownClass = component.getPaymentStatusClass('Other');

    // Assert
    expect(paidClass).toContain('--paid');
    expect(pendingClass).toContain('--pending');
    expect(failedClass).toContain('--failed');
    expect(unknownClass).toContain('--default');
  });

  it('updates table period when a valid option is selected', () => {
    // Arrange

    // Act
    component.onTablePeriodChange('Last 30 days');

    // Assert
    expect(component.selectedTablePeriod).toBe('Last 30 days');
  });

  it('updates currency when a valid option is selected', () => {
    // Arrange

    // Act
    component.onCurrencyChange('COP');

    // Assert
    expect(component.selectedCurrency).toBe('COP');
  });

  it('renders empty message when no rows exist', () => {
    // Arrange
    const emptyFixture = TestBed.createComponent(PortalHotelesReportsPage);
    const emptyComponent = emptyFixture.componentInstance;
    emptyComponent.reportRows = [];

    // Act
    emptyFixture.detectChanges();
    const element = emptyFixture.nativeElement as HTMLElement;

    // Assert
    expect(element.textContent).toContain('No revenue transactions available.');
    expect(emptyComponent.hasRows).toBeFalse();
    expect(emptyComponent.rangeLabel).toBe('Showing 0-0 of 0 transactions');
  });
});
