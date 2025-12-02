# PersonaEvolve: Implicit Behavioral Alignment of Language Agents in High-Stakes Crowd Simulations

<div align="center">
<img src="./images/framework.jpg" alt="PEBA-PEvo Diagram" width="600">
</div>

This repository accompanies our research paper titled [Implicit Behavioral Alignment of Language Agents in High-Stakes Crowd Simulations](https://arxiv.org/abs/2509.16457), and contains the implementation of Persona–Environment Behavioral Alignment (PEBA) and its optimization algorithm, PersonaEvolve (PEvo) in a Unity3D-based Active Shooter Incident Simulation. The framework reduces the Behavior–Realism Gap by iteratively refining agent personas so their collective behaviors match expert expectations. 

For demo videos and more information, please visit our [Project Homepage](https://hats-ict.github.io/peba-asi-web/).

> [!NOTE]  
> **Proprietary Constraints Notice** The original Unity environment scene will not be made publicly available at the moment due to proprietary constraints. We provide sample simulation log data and a interactive replay web viewer for visualization and data analysis code for educational purposes.

## <img src="./images/mavis.png" alt="Agent Mavis" width="30"> Set Up Environment

```
git clone https://github.com/HATS-ICT/PEBA-ASI
```

Set up virtual environment and

```
pip install -r requirements.txt
```

## <img src="./images/alice.png" alt="Agent Alice" width="30"> Download Sample Simulation Data

WIP


## <img src="./images/bob.png" alt="Agent Bob" width="30"> Replay Simulation

WIP


## <img src="./images/charlie.png" alt="Agent Charlie" width="30"> Analyze Simulation



```shell
### Behavior Classification
python classify_behavior.py --folder "Simulation_Run_Folder_Name"

### Analysis Test
python analyze_optimization.py --runs "Optimization_Run_Folder_Name"
```




## Authors and Citation


**Authors:** Yunzhe Wang, Gale M. Lucas, Burcin Becerik-Gerber, Volkan Ustun

If you used this codebase, please cite our paper:

```
@inproceedings{wang2025implicit,
  title={Implicit Behavioral Alignment of Language Agents in High-Stakes Crowd Simulations},
  author={Wang, Yunzhe and Lucas, Gale and Becerik-Gerber, Burcin and Ustun, Volkan},
  booktitle={Proceedings of the 2025 Conference on Empirical Methods in Natural Language Processing},
  pages={30669--30686},
  year={2025}
}
```
