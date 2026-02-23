@echo off
echo ========================================
echo  QUICK 3D MODEL ASSIGNMENT
echo ========================================
echo.
echo This script helps you assign 3D models to products quickly.
echo.
echo BEFORE RUNNING THIS:
echo 1. Download GLB file from Meshy.ai
echo 2. Place it in client\public\models\[category]\
echo 3. Run this script
echo.
pause

:MENU
echo.
echo ========================================
echo Select Product Type:
echo ========================================
echo.
echo 1. Festival Offer Dress (Pink Dress)
echo 2. Toy Product
echo 3. Feeding Product
echo 4. Footwear
echo 5. Girl Fashion
echo 6. Boy Fashion
echo 7. Custom (Enter Product ID)
echo 8. Exit
echo.
set /p choice="Enter your choice (1-8): "

if "%choice%"=="1" (
  echo.
  echo Enter the GLB filename in models/festival-offer/
  set /p filename="Filename (e.g., pink-dress.glb): "
  echo.
  echo Finding festival offer products...
  cd server
  node find-dreamtoys.js
  echo.
  set /p productid="Enter Product ID: "
  node assign-single-product.js %productid% /models/festival-offer/%filename%
  echo.
  echo DONE! Refresh browser (Ctrl+F5) to see changes.
  pause
  goto MENU
)

if "%choice%"=="7" (
  echo.
  set /p productid="Enter Product ID: "
  set /p modelpath="Enter model path (e.g., /models/toys/car.glb): "
  cd server
  node assign-single-product.js %productid% %modelpath%
  echo.
  echo DONE! Refresh browser (Ctrl+F5) to see changes.
  pause
  goto MENU
)

if "%choice%"=="8" (
  exit
)

echo Invalid choice. Try again.
goto MENU
