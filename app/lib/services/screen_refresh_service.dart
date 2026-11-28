import 'dart:async';

import 'package:flutter/material.dart';

final RouteObserver<PageRoute<dynamic>> appRouteObserver =
    RouteObserver<PageRoute<dynamic>>();

class TabVisibilityScope extends InheritedWidget {
  final bool isActive;

  const TabVisibilityScope({
    super.key,
    required this.isActive,
    required super.child,
  });

  static TabVisibilityScope? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<TabVisibilityScope>();

  @override
  bool updateShouldNotify(TabVisibilityScope oldWidget) =>
      isActive != oldWidget.isActive;
}

mixin RefreshOnRouteReturn<T extends StatefulWidget> on State<T>
    implements RouteAware {
  PageRoute<dynamic>? _observedRoute;
  bool? _wasTabActive;

  bool get isTabActive => _wasTabActive != false;

  Future<void> refreshOnRouteReturn();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final route = ModalRoute.of(context);
    if (route is PageRoute<dynamic> && route != _observedRoute) {
      if (_observedRoute != null) {
        appRouteObserver.unsubscribe(this);
      }
      _observedRoute = route;
      appRouteObserver.subscribe(this, route);
    }

    final tabVisibility = TabVisibilityScope.maybeOf(context);
    if (tabVisibility != null) {
      if (_wasTabActive == false && tabVisibility.isActive) {
        unawaited(refreshOnRouteReturn());
      }
      _wasTabActive = tabVisibility.isActive;
    }
  }

  @override
  void didPopNext() {
    if (_wasTabActive == false) return;
    unawaited(refreshOnRouteReturn());
  }

  @override
  void didPush() {}

  @override
  void didPushNext() {}

  @override
  void didPop() {}

  @override
  void dispose() {
    appRouteObserver.unsubscribe(this);
    super.dispose();
  }
}

/// Global screen refresh notifier used across services
class ScreenRefreshService {
  static final ValueNotifier<int> refreshNotifier = ValueNotifier<int>(0);

  static void notifyRefreshed() {
    refreshNotifier.value++;
  }
}
