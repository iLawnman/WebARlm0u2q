function animate(timestamp, frame) {
  if (frame) {
    const session = renderer.xr.getSession();
    const referenceSpace = renderer.xr.getReferenceSpace();

    // Запрашиваем hit-test source только один раз
    if (!hitTestSourceRequested && session) {
      hitTestSourceRequested = true;

      session.requestReferenceSpace('viewer').then((viewerSpace) => {
        return session.requestHitTestSource({ space: viewerSpace });
      }).then((source) => {
        hitTestSource = source;
        console.log('✅ Hit-test source получен:', hitTestSource);
      }).catch((err) => {
        console.error('❌ Ошибка создания hit-test source:', err);
        hitTestSourceRequested = false;
      });
    }

    // Проверяем что hitTestSource существует перед использованием
    if (hitTestSource) {
      try {
        // Правильный метод для получения результатов
        const hitTestResults = frame.getHitTestResults(hitTestSource);

        if (hitTestResults && hitTestResults.length > 0 && !placed) {
          const hit = hitTestResults[0];
          const pose = hit.getPose(referenceSpace);

          if (pose) {
            reticle.visible = true;
            reticle.matrix.fromArray(pose.transform.matrix);
          }
        } else if (!placed) {
          reticle.visible = false;
        }
      } catch (err) {
        console.error('❌ Ошибка getHitTestResults:', err);
      }
    }
  }

  if (placed) {
    if (mainPanel) mainPanel.lookAt(camera.position);

    const controller = renderer.xr.getController(0);
    if (controller) {
      controller.updateMatrixWorld();
      tempMatrix.identity().extractRotation(controller.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

      if (mainPanel) mainPanel.update(timestamp, raycaster);
      if (fixedPanel) fixedPanel.update(timestamp, raycaster);
    }
  }

  renderer.render(scene, camera);
}